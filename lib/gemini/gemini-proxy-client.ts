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

/**
 * Gemini Live API client via proxy
 */
export class GeminiProxyClient {
  private ws: WebSocket | null = null;
  private _state: SessionState = 'idle';
  private config: GeminiLiveConfig | null = null;
  private _isDisposed = false;

  // Transcript accumulation buffers
  private inputTranscriptBuffer = '';
  private outputTranscriptBuffer = '';

  // Track last emitted sentence to avoid duplicates
  private lastEmittedOutputSentence = '';

  // Accumulate full transcript for final save (separate from sentence-by-sentence display)
  private fullOutputTranscript = '';

  // Reconnection settings
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;
  private readonly reconnectDelayMs = 1000;
  private lastConfig: Partial<GeminiLiveConfig> | null = null;

  // Event handlers - use full function signature from GeminiClientEvents
  private eventHandlers: {
    [K in keyof GeminiClientEvents]?: Array<GeminiClientEvents[K]>;
  } = {};

  /**
   * Get current session state
   */
  get state(): SessionState {
    return this._state;
  }

  /**
   * Clean up transcript by removing unnecessary spaces
   * Gemini's Chinese transcription adds spaces between characters
   */
  private cleanTranscript(text: string): string {
    return (
      text
        // Remove spaces between Chinese/Japanese/Korean characters
        .replace(/([^\x00-\x7F])\s+([^\x00-\x7F])/g, '$1$2')
        // Remove spaces before Chinese punctuation
        .replace(/\s+([，。！？、；：」】』}）])/g, '$1')
        // Remove spaces after Chinese punctuation (but keep one space after period/question mark for readability)
        .replace(/([，、；：「【『{（])\s+/g, '$1')
        // Normalize multiple spaces to single space
        .replace(/\s{2,}/g, ' ')
        // Trim leading/trailing spaces
        .trim()
    );
  }

  /**
   * Extract the last complete sentence from text buffer
   * Returns { sentence: string | null, remaining: string }
   * Sentences end with: 。！？.!?
   */
  private extractLastSentence(text: string): { sentence: string | null; remaining: string } {
    // Find the last sentence-ending punctuation
    const sentenceEndPattern = /[。！？.!?]/g;
    let lastEndIndex = -1;
    let match;

    while ((match = sentenceEndPattern.exec(text)) !== null) {
      lastEndIndex = match.index;
    }

    if (lastEndIndex === -1) {
      // No complete sentence yet
      return { sentence: null, remaining: text };
    }

    // Extract the sentence (up to and including the punctuation)
    const sentence = text.slice(0, lastEndIndex + 1).trim();
    const remaining = text.slice(lastEndIndex + 1).trim();

    return { sentence: sentence || null, remaining };
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
    (this.eventHandlers[event] as Array<GeminiClientEvents[K]>).push(callback);
  }

  /**
   * Unsubscribe from events
   */
  off<K extends keyof GeminiClientEvents>(event: K, callback: GeminiClientEvents[K]): void {
    const handlers = this.eventHandlers[event] as Array<GeminiClientEvents[K]> | undefined;
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event - properly pass all arguments
   */
  private emit<K extends keyof GeminiClientEvents>(
    event: K,
    ...args: Parameters<GeminiClientEvents[K]>
  ): void {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      handlers.forEach((handler) => {
        // Type assertion to handle the spread operator
        (handler as (...args: Parameters<GeminiClientEvents[K]>) => void)(...args);
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
      // Gemini sends incremental transcripts - we accumulate them until turnComplete
      if (inputTranscription?.text) {
        // Accumulate transcript chunks (use += not =)
        this.inputTranscriptBuffer += inputTranscription.text;
        logger.debug('Received input transcription (partial)', {
          module: 'gemini-proxy-client',
          action: 'inputTranscription',
          chunkLength: inputTranscription.text.length,
          totalLength: this.inputTranscriptBuffer.length,
          chunkPreview: inputTranscription.text.slice(0, 50),
        });
        // Clean and emit accumulated transcript for real-time display
        const cleanedPartial = this.cleanTranscript(this.inputTranscriptBuffer);
        this.emit('inputTranscript', cleanedPartial, false);
      }

      // Handle output transcription (AI's speech)
      // Gemini sends incremental transcripts - we emit complete sentences as they form
      if (outputTranscription?.text) {
        // Accumulate transcript chunks
        this.outputTranscriptBuffer += outputTranscription.text;

        // Clean the buffer first
        const cleanedBuffer = this.cleanTranscript(this.outputTranscriptBuffer);

        // Try to extract complete sentences
        const { sentence, remaining } = this.extractLastSentence(cleanedBuffer);

        if (sentence && sentence !== this.lastEmittedOutputSentence) {
          // Emit the complete sentence for display
          logger.debug('Emitting complete sentence', {
            module: 'gemini-proxy-client',
            action: 'outputTranscription-sentence',
            sentenceLength: sentence.length,
            sentence: sentence.slice(0, 80),
          });
          this.emit('outputTranscript', sentence, false);
          this.lastEmittedOutputSentence = sentence;

          // Accumulate to full transcript for final save
          this.fullOutputTranscript += (this.fullOutputTranscript ? '' : '') + sentence;

          // Keep only the remaining incomplete text in buffer
          this.outputTranscriptBuffer = remaining;
        } else if (!sentence && cleanedBuffer) {
          // No complete sentence yet, show partial for immediate feedback
          // Only emit if it's different from last emitted
          if (cleanedBuffer !== this.lastEmittedOutputSentence) {
            this.emit('outputTranscript', cleanedBuffer, false);
          }
        }
      }

      // Handle turn complete - this is when transcripts become final
      if (turnComplete) {
        this.setState('listening');

        // Emit final transcripts if we have accumulated any
        if (this.inputTranscriptBuffer) {
          // Clean up transcript: remove unnecessary spaces in Chinese text
          const cleanedInput = this.cleanTranscript(this.inputTranscriptBuffer);
          logger.info('Input transcription complete', {
            module: 'gemini-proxy-client',
            action: 'inputTranscription-final',
            originalLength: this.inputTranscriptBuffer.length,
            cleanedLength: cleanedInput.length,
          });
          this.emit('inputTranscript', cleanedInput, true);
          this.inputTranscriptBuffer = '';
        }

        if (this.fullOutputTranscript || this.outputTranscriptBuffer) {
          // Append any remaining incomplete text to full transcript
          const remainingText = this.cleanTranscript(this.outputTranscriptBuffer);
          const finalText = this.fullOutputTranscript + remainingText;

          if (finalText) {
            logger.info('Output transcription complete', {
              module: 'gemini-proxy-client',
              action: 'outputTranscription-final',
              finalLength: finalText.length,
            });
            this.emit('outputTranscript', finalText, true);
          }
          // Clear all output transcript state
          this.outputTranscriptBuffer = '';
          this.lastEmittedOutputSentence = '';
          this.fullOutputTranscript = '';
        }

        this.emit('turnComplete');
      }

      // Handle interrupted - clear buffers as the turn was interrupted
      if (interrupted) {
        // Clear transcript buffers as the turn was interrupted
        if (
          this.inputTranscriptBuffer ||
          this.outputTranscriptBuffer ||
          this.fullOutputTranscript
        ) {
          logger.debug('Clearing transcript buffers due to interruption', {
            module: 'gemini-proxy-client',
            action: 'interrupted',
            hadInputBuffer: !!this.inputTranscriptBuffer,
            hadOutputBuffer: !!this.outputTranscriptBuffer,
          });
          this.inputTranscriptBuffer = '';
          this.outputTranscriptBuffer = '';
          this.lastEmittedOutputSentence = '';
          this.fullOutputTranscript = '';
        }
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
    // Clear transcript buffers on disconnect
    this.inputTranscriptBuffer = '';
    this.outputTranscriptBuffer = '';
    this.lastEmittedOutputSentence = '';
    this.fullOutputTranscript = '';
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
