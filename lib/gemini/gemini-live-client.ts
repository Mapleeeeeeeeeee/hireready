/**
 * Gemini Live API client for real-time voice conversations
 * Handles WebSocket connection to Gemini using @google/genai SDK
 */

import { GoogleGenAI, type LiveServerMessage } from '@google/genai';
import { logger } from '@/lib/utils/logger';
import { WebSocketError, GeminiAPIError } from '@/lib/utils/errors';
import { withSafeRetry, type Result, Ok, Err } from '@/lib/utils/result';
import {
  type GeminiLiveConfig,
  type GeminiClientEvents,
  type SessionState,
  DEFAULT_GEMINI_CONFIG,
  AUDIO_CONFIG,
} from './types';

type EventCallback<T> = T extends void ? () => void : (data: T) => void;

/**
 * Gemini Live API client
 */
export class GeminiLiveClient {
  private ai: GoogleGenAI | null = null;
  private session: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
  private _state: SessionState = 'idle';
  private config: GeminiLiveConfig | null = null;
  private _isDisposed = false;

  // Reconnection settings
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;
  private readonly reconnectDelayMs = 1000;
  private lastApiKey: string | null = null;
  private lastConfig: Partial<GeminiLiveConfig> | null = null;

  // Event handlers
  private eventHandlers: {
    [K in keyof GeminiClientEvents]?: Array<EventCallback<Parameters<GeminiClientEvents[K]>[0]>>;
  } = {};

  /**
   * Get current session state
   */
  get state(): SessionState {
    return this._state;
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return (
      this._state === 'listening' || this._state === 'speaking' || this._state === 'processing'
    );
  }

  /**
   * Subscribe to events
   */
  on<K extends keyof GeminiClientEvents>(event: K, callback: GeminiClientEvents[K]): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    // Type-safe push using proper generic constraint
    const handlers = this.eventHandlers[event] as Array<
      EventCallback<Parameters<GeminiClientEvents[K]>[0]>
    >;
    handlers.push(callback as EventCallback<Parameters<GeminiClientEvents[K]>[0]>);
  }

  /**
   * Unsubscribe from events
   */
  off<K extends keyof GeminiClientEvents>(event: K, callback: GeminiClientEvents[K]): void {
    const handlers = this.eventHandlers[event] as
      | Array<EventCallback<Parameters<GeminiClientEvents[K]>[0]>>
      | undefined;
    if (handlers) {
      const index = handlers.indexOf(
        callback as EventCallback<Parameters<GeminiClientEvents[K]>[0]>
      );
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  private emit<K extends keyof GeminiClientEvents>(
    event: K,
    ...args: Parameters<GeminiClientEvents[K]>
  ): void {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      handlers.forEach((handler) => {
        if (args.length === 0) {
          (handler as () => void)();
        } else {
          (handler as (data: unknown) => void)(args[0]);
        }
      });
    }
  }

  /**
   * Set state and emit event
   */
  private setState(state: SessionState): void {
    if (this._state !== state) {
      const previousState = this._state;
      this._state = state;
      this.emit('stateChange', state);
      logger.debug('Session state changed', {
        module: 'gemini-client',
        action: 'setState',
        from: previousState,
        to: state,
      });
    }
  }

  /**
   * Connect to Gemini Live API
   */
  connect = withSafeRetry(
    async (apiKey: string, config: Partial<GeminiLiveConfig>): Promise<void> => {
      // Fix #12: Clean up existing session before reconnecting
      if (this.isConnected || this.session) {
        logger.info('Cleaning up existing session before reconnect', {
          module: 'gemini-client',
          action: 'connect',
        });
        this.cleanupSession();
      }

      // Store credentials for potential reconnection
      this.lastApiKey = apiKey;
      this.lastConfig = config;
      this._isDisposed = false;

      this.setState('connecting');

      // Merge with default config
      this.config = {
        ...DEFAULT_GEMINI_CONFIG,
        ...config,
      } as GeminiLiveConfig;

      // Initialize GoogleGenAI client
      this.ai = new GoogleGenAI({ apiKey });

      try {
        // Connect to Live API
        this.session = await this.ai.live.connect({
          model: this.config.model,
          callbacks: {
            onopen: () => {
              logger.info('WebSocket opened', {
                module: 'gemini-client',
                action: 'onopen',
              });
              this.setState('listening');
              this.emit('open');
            },
            onclose: (event: CloseEvent) => {
              logger.info('WebSocket closed', {
                module: 'gemini-client',
                action: 'onclose',
                code: event.code,
                reason: event.reason,
              });
              this.setState('idle');
              this.emit('close', event.code, event.reason);
            },
            onerror: (error: ErrorEvent) => {
              logger.error('WebSocket error', new Error(error.message), {
                module: 'gemini-client',
                action: 'onerror',
              });
              this.setState('error');
              this.emit('error', new WebSocketError(error.message));
              // Fix #8: Attempt auto-reconnection on recoverable errors
              this.attemptReconnect();
            },
            onmessage: (message: LiveServerMessage) => {
              this.handleServerMessage(message);
            },
          },
          config: {
            // SDK's Modality type is more restrictive than our config type
            // This cast is safe as we only use 'TEXT' and 'AUDIO' values
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            responseModalities: this.config.responseModalities as any,
            systemInstruction: {
              parts: [{ text: this.config.systemInstruction }],
            },
            speechConfig: this.config.voiceConfig
              ? {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: this.config.voiceConfig.voiceName || 'Aoede',
                    },
                  },
                }
              : undefined,
          },
        });

        logger.info('Connected to Gemini Live API', {
          module: 'gemini-client',
          action: 'connect',
          model: this.config.model,
        });
      } catch (error) {
        this.setState('error');
        throw new GeminiAPIError((error as Error).message, undefined, error);
      }
    },
    { module: 'gemini-client', action: 'connect', maxAttempts: 3 }
  );

  /**
   * Handle incoming server messages
   */
  private handleServerMessage(message: LiveServerMessage): void {
    // Handle setup complete
    if (message.setupComplete) {
      logger.debug('Setup complete', {
        module: 'gemini-client',
        action: 'handleServerMessage',
      });
      return;
    }

    // Handle tool call (not used in basic voice chat)
    if (message.toolCall) {
      logger.debug('Tool call received', {
        module: 'gemini-client',
        action: 'handleServerMessage',
        tools: message.toolCall.functionCalls?.map((fc) => fc.name),
      });
      return;
    }

    // Handle server content
    if (message.serverContent) {
      const { modelTurn, turnComplete, interrupted, inputTranscription, outputTranscription } =
        message.serverContent;

      // Handle model turn (AI response)
      if (modelTurn?.parts) {
        this.setState('speaking');

        for (const part of modelTurn.parts) {
          // Handle audio response
          if (part.inlineData?.data) {
            const base64Data = part.inlineData.data;
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            this.emit('audio', bytes.buffer);
          }

          // Handle text response
          if (part.text) {
            this.emit('text', part.text);
          }
        }
      }

      // Handle input transcription (user's speech)
      if (inputTranscription?.text) {
        this.emit('inputTranscript', inputTranscription.text, inputTranscription.finished ?? false);
      }

      // Handle output transcription (AI's speech)
      if (outputTranscription?.text) {
        this.emit(
          'outputTranscript',
          outputTranscription.text,
          outputTranscription.finished ?? false
        );
      }

      // Handle turn complete
      if (turnComplete) {
        logger.debug('Turn complete', {
          module: 'gemini-client',
          action: 'handleServerMessage',
        });
        this.setState('listening');
        this.emit('turnComplete');
      }

      // Handle interrupted
      if (interrupted) {
        logger.debug('Model interrupted', {
          module: 'gemini-client',
          action: 'handleServerMessage',
        });
        this.emit('interrupted');
      }
    }
  }

  /**
   * Send audio data to Gemini
   */
  sendAudio(base64Chunk: string): Result<void> {
    if (!this.session) {
      return Err(new WebSocketError('Session not connected'));
    }

    try {
      this.session.sendRealtimeInput({
        audio: {
          data: base64Chunk,
          mimeType: `audio/pcm;rate=${AUDIO_CONFIG.INPUT_SAMPLE_RATE}`,
        },
      });

      // Update state to processing when user is speaking
      if (this._state === 'listening') {
        this.setState('processing');
      }

      return Ok(undefined);
    } catch (error) {
      logger.error('Failed to send audio', error as Error, {
        module: 'gemini-client',
        action: 'sendAudio',
      });
      return Err(new GeminiAPIError('Failed to send audio'));
    }
  }

  /**
   * Send text message to Gemini
   */
  sendText(text: string): Result<void> {
    if (!this.session) {
      return Err(new WebSocketError('Session not connected'));
    }

    try {
      this.session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      });

      this.setState('processing');

      logger.debug('Text sent', {
        module: 'gemini-client',
        action: 'sendText',
        textLength: text.length,
      });

      return Ok(undefined);
    } catch (error) {
      logger.error('Failed to send text', error as Error, {
        module: 'gemini-client',
        action: 'sendText',
      });
      return Err(new GeminiAPIError('Failed to send text'));
    }
  }

  /**
   * Interrupt the current AI response
   */
  interrupt(): void {
    // Sending any audio interrupts the current response
    // The API handles interruption automatically
    logger.debug('Interrupt requested', {
      module: 'gemini-client',
      action: 'interrupt',
    });
  }

  /**
   * Clean up session without full disconnect (for reconnection)
   */
  private cleanupSession(): void {
    if (this.session) {
      try {
        this.session.close();
      } catch (error) {
        logger.warn('Error closing session during cleanup', {
          module: 'gemini-client',
          action: 'cleanupSession',
          error: (error as Error).message,
        });
      }
      this.session = null;
    }
    this.ai = null;
  }

  /**
   * Attempt to reconnect after an error (Fix #8)
   */
  private attemptReconnect(): void {
    if (this._isDisposed) {
      logger.debug('Skipping reconnect - client disposed', {
        module: 'gemini-client',
        action: 'attemptReconnect',
      });
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', new Error('Reconnection failed'), {
        module: 'gemini-client',
        action: 'attemptReconnect',
        attempts: this.reconnectAttempts,
      });
      this.reconnectAttempts = 0;
      return;
    }

    if (!this.lastApiKey || !this.lastConfig) {
      logger.warn('Cannot reconnect - missing credentials', {
        module: 'gemini-client',
        action: 'attemptReconnect',
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1);

    logger.info('Attempting reconnection', {
      module: 'gemini-client',
      action: 'attemptReconnect',
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delayMs: delay,
    });

    setTimeout(() => {
      if (!this._isDisposed && this.lastApiKey && this.lastConfig) {
        this.connect(this.lastApiKey, this.lastConfig).catch((error) => {
          logger.error('Reconnection failed', error as Error, {
            module: 'gemini-client',
            action: 'attemptReconnect',
          });
        });
      }
    }, delay);
  }

  /**
   * Disconnect from Gemini
   */
  disconnect(): void {
    this.cleanupSession();
    this.config = null;
    this.reconnectAttempts = 0;
    this.setState('idle');

    logger.info('Disconnected from Gemini', {
      module: 'gemini-client',
      action: 'disconnect',
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this._isDisposed = true;
    this.lastApiKey = null;
    this.lastConfig = null;
    this.disconnect();
    this.eventHandlers = {};
  }
}

/**
 * Create a new Gemini Live client instance
 */
export function createGeminiLiveClient(): GeminiLiveClient {
  return new GeminiLiveClient();
}
