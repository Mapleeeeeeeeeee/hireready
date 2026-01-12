/**
 * Gemini Live API client via WebSocket Proxy
 * API key stays on the server - this client only talks to our proxy
 */

import { logger } from '@/lib/utils/logger';
import { WebSocketError, GeminiAPIError } from '@/lib/utils/errors';
import { type Result, Ok, Err } from '@/lib/utils/result';
import {
  type GeminiLiveConfig,
  type GeminiClientEvents,
  type SessionState,
  DEFAULT_GEMINI_CONFIG,
  AUDIO_CONFIG,
} from './types';

type EventCallback<T> = T extends void ? () => void : (data: T) => void;

/**
 * Gemini Live API client via proxy
 */
export class GeminiProxyClient {
  private ws: WebSocket | null = null;
  private _state: SessionState = 'idle';
  private config: GeminiLiveConfig | null = null;
  private _isDisposed = false;

  // Reconnection settings
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;
  private readonly reconnectDelayMs = 1000;
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
        module: 'gemini-proxy-client',
        action: 'setState',
        from: previousState,
        to: state,
      });
    }
  }

  /**
   * Connect to Gemini via proxy
   */
  async connect(config: Partial<GeminiLiveConfig>): Promise<Result<void>> {
    // Clean up existing connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.lastConfig = config;
    this._isDisposed = false;
    this.setState('connecting');

    // Merge with default config
    this.config = {
      ...DEFAULT_GEMINI_CONFIG,
      ...config,
    } as GeminiLiveConfig;

    return new Promise((resolve) => {
      try {
        // Connect to our WebSocket proxy
        const wsUrl =
          typeof window !== 'undefined'
            ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/gemini`
            : 'ws://localhost:5555/ws/gemini';

        logger.info('Connecting to WebSocket proxy', {
          module: 'gemini-proxy-client',
          action: 'connect',
          url: wsUrl,
        });

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          logger.info('Connected to proxy, initializing Gemini session', {
            module: 'gemini-proxy-client',
            action: 'onopen',
          });

          // Send connect command to proxy
          this.ws?.send(
            JSON.stringify({
              type: 'connect',
              model: this.config?.model,
              config: {
                responseModalities: this.config?.responseModalities,
                systemInstruction: this.config?.systemInstruction,
                voiceName: this.config?.voiceConfig?.voiceName,
              },
            })
          );
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleProxyMessage(message, resolve);
          } catch (error) {
            logger.error('Failed to parse proxy message', error as Error, {
              module: 'gemini-proxy-client',
              action: 'onmessage',
            });
          }
        };

        this.ws.onclose = (event) => {
          logger.info('Proxy connection closed', {
            module: 'gemini-proxy-client',
            action: 'onclose',
            code: event.code,
            reason: event.reason,
          });
          this.setState('idle');
          this.emit('close', event.code, event.reason);
        };

        this.ws.onerror = () => {
          logger.error('Proxy connection error', new Error('WebSocket error'), {
            module: 'gemini-proxy-client',
            action: 'onerror',
          });
          this.setState('error');
          this.emit('error', new WebSocketError('Proxy connection error'));
          resolve(Err(new WebSocketError('Failed to connect to proxy')));
        };
      } catch (error) {
        this.setState('error');
        resolve(Err(new GeminiAPIError((error as Error).message)));
      }
    });
  }

  /**
   * Handle messages from proxy
   */
  private handleProxyMessage(
    message: {
      type: string;
      data?: unknown;
      message?: string;
      code?: number;
      reason?: string;
    },
    connectResolve?: (result: Result<void>) => void
  ): void {
    switch (message.type) {
      case 'connected':
        logger.info('Gemini session established via proxy', {
          module: 'gemini-proxy-client',
          action: 'handleProxyMessage',
        });
        this.setState('listening');
        this.emit('open');
        connectResolve?.(Ok(undefined));
        break;

      case 'error':
        logger.error('Proxy error', new Error(message.message || 'Unknown error'), {
          module: 'gemini-proxy-client',
          action: 'handleProxyMessage',
        });
        this.setState('error');
        this.emit('error', new GeminiAPIError(message.message || 'Unknown error'));
        connectResolve?.(Err(new GeminiAPIError(message.message || 'Unknown error')));
        break;

      case 'gemini_close':
        this.setState('idle');
        this.emit('close', message.code || 1000, message.reason || '');
        break;

      case 'gemini_message':
        this.handleGeminiMessage(message.data);
        break;
    }
  }

  /**
   * Handle Gemini server messages (forwarded from proxy)
   */
  private handleGeminiMessage(data: unknown): void {
    // Debug: log received message structure
    logger.debug('Received Gemini message', {
      module: 'gemini-proxy-client',
      action: 'handleGeminiMessage',
      keys: Object.keys(data as object),
    });

    const message = data as {
      setupComplete?: boolean;
      toolCall?: { functionCalls?: { name: string }[] };
      serverContent?: {
        modelTurn?: { parts?: { inlineData?: { data: string }; text?: string }[] };
        turnComplete?: boolean;
        interrupted?: boolean;
        inputTranscription?: { text: string; finished?: boolean };
        outputTranscription?: { text: string; finished?: boolean };
      };
    };

    if (message.setupComplete) {
      return;
    }

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
            logger.info('Received audio data', {
              module: 'gemini-proxy-client',
              action: 'handleGeminiMessage',
              base64Length: base64Data.length,
            });

            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            logger.info('Emitting audio', {
              module: 'gemini-proxy-client',
              action: 'handleGeminiMessage',
              byteLength: bytes.buffer.byteLength,
            });

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
        this.setState('listening');
        this.emit('turnComplete');
      }

      // Handle interrupted
      if (interrupted) {
        this.emit('interrupted');
      }
    }
  }

  /**
   * Send audio data to Gemini via proxy
   */
  sendAudio(base64Chunk: string): Result<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this._isDisposed) {
      return Err(new WebSocketError('Not connected'));
    }

    // Only send audio when in listening or processing state
    if (this._state !== 'listening' && this._state !== 'processing') {
      return Ok(undefined);
    }

    try {
      this.ws.send(
        JSON.stringify({
          type: 'audio',
          data: base64Chunk,
          mimeType: `audio/pcm;rate=${AUDIO_CONFIG.INPUT_SAMPLE_RATE}`,
        })
      );

      if (this._state === 'listening') {
        this.setState('processing');
      }

      return Ok(undefined);
    } catch {
      return Err(new GeminiAPIError('Failed to send audio'));
    }
  }

  /**
   * Send text message to Gemini via proxy
   */
  sendText(text: string): Result<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Err(new WebSocketError('Not connected'));
    }

    try {
      this.ws.send(
        JSON.stringify({
          type: 'text',
          text,
        })
      );

      this.setState('processing');
      return Ok(undefined);
    } catch {
      return Err(new GeminiAPIError('Failed to send text'));
    }
  }

  /**
   * Disconnect from Gemini
   */
  disconnect(): void {
    if (this.ws) {
      try {
        this.ws.send(JSON.stringify({ type: 'disconnect' }));
      } catch {
        // Ignore send errors during disconnect
      }
      this.ws.close();
      this.ws = null;
    }
    this.config = null;
    this.reconnectAttempts = 0;
    this.setState('idle');

    logger.info('Disconnected from Gemini proxy', {
      module: 'gemini-proxy-client',
      action: 'disconnect',
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this._isDisposed = true;
    this.lastConfig = null;
    this.disconnect();
    this.eventHandlers = {};
  }
}
