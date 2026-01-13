/**
 * Audio streamer module for playing back AI audio responses
 * Handles PCM16 audio data from Gemini Live API
 */

import { logger } from '@/lib/utils/logger';
import { AudioContextError } from '@/lib/utils/errors';
import { AUDIO_CONFIG, type AudioStreamerEvents } from './types';

type EventCallback<T> = (data: T) => void;

/**
 * Audio streamer class for playback
 */
export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private audioQueue: Float32Array[] = [];
  private _isPlaying = false;
  private _disposed = false;
  private scheduledTime = 0;
  private bufferDuration = 0.1; // 100ms buffer ahead
  private pendingBufferCount = 0; // Track number of buffers currently playing/scheduled

  // Event handlers
  private eventHandlers: {
    [K in keyof AudioStreamerEvents]?: Array<EventCallback<Parameters<AudioStreamerEvents[K]>[0]>>;
  } = {};

  /**
   * Check if audio is currently playing
   */
  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * Subscribe to events
   */
  on<K extends keyof AudioStreamerEvents>(event: K, callback: AudioStreamerEvents[K]): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event]!.push(callback as EventCallback<unknown>);
  }

  /**
   * Unsubscribe from events
   */
  off<K extends keyof AudioStreamerEvents>(event: K, callback: AudioStreamerEvents[K]): void {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      const index = handlers.indexOf(callback as EventCallback<unknown>);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  private emit<K extends keyof AudioStreamerEvents>(
    event: K,
    data: Parameters<AudioStreamerEvents[K]>[0]
  ): void {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * Initialize the audio context
   */
  async initialize(): Promise<void> {
    // Already initialized
    if (this.audioContext && this.audioContext.state !== 'closed') {
      return;
    }

    // Already disposed, don't reinitialize
    if (this._disposed) {
      throw new AudioContextError('Audio streamer has been disposed');
    }

    try {
      this.audioContext = new AudioContext({
        sampleRate: AUDIO_CONFIG.OUTPUT_SAMPLE_RATE,
      });

      // Check if disposed during async operations (React StrictMode)
      if (this._disposed) {
        this.audioContext.close();
        this.audioContext = null;
        throw new AudioContextError('Audio streamer disposed during initialization');
      }

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      // Load volume meter worklet
      await this.audioContext.audioWorklet.addModule('/worklets/volume-meter.js');

      // Check again if disposed during async worklet loading
      if (this._disposed || !this.audioContext || this.audioContext.state === 'closed') {
        if (this.audioContext && this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
        this.audioContext = null;
        this.gainNode = null;
        throw new AudioContextError('Audio streamer disposed during initialization');
      }

      // Create worklet node for volume metering
      this.workletNode = new AudioWorkletNode(this.audioContext, 'volume-meter-processor');

      this.workletNode.port.onmessage = (event) => {
        this.emit('volume', event.data.volume);
      };

      // Connect: gainNode -> workletNode -> destination
      this.gainNode.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);

      logger.info('Audio streamer initialized', {
        module: 'audio-streamer',
        action: 'initialize',
        sampleRate: this.audioContext.sampleRate,
      });
    } catch (error) {
      // Clean up partial initialization
      if (this.audioContext && this.audioContext.state !== 'closed') {
        try {
          this.audioContext.close();
        } catch {
          // Ignore close errors
        }
      }
      this.audioContext = null;
      this.gainNode = null;
      this.workletNode = null;

      throw new AudioContextError(
        `Failed to initialize audio streamer: ${(error as Error).message}`
      );
    }
  }

  /**
   * Resume audio context (needed after user interaction)
   * Handles 'closed' state to prevent errors after dispose
   */
  async resume(): Promise<void> {
    // Guard against closed or null context
    if (!this.audioContext || this.audioContext.state === 'closed') {
      logger.warn('Cannot resume: AudioContext is closed or null', {
        module: 'audio-streamer',
        action: 'resume',
        state: this.audioContext?.state ?? 'null',
      });
      return;
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      logger.debug('Audio context resumed', {
        module: 'audio-streamer',
        action: 'resume',
      });
    }
  }

  /**
   * Add PCM16 audio data to the playback queue
   */
  addPCM16(data: ArrayBuffer): void {
    // Removed verbose per-chunk logging to avoid spam

    if (!this.audioContext || !this.gainNode) {
      logger.warn('Audio streamer not initialized', {
        module: 'audio-streamer',
        action: 'addPCM16',
      });
      return;
    }

    // Convert PCM16 to Float32
    const float32Data = this.pcm16ToFloat32(data);

    // Add to queue
    this.audioQueue.push(float32Data);

    // Start playback if not already playing
    if (!this._isPlaying) {
      this.startPlayback();
    }
  }

  /**
   * Start playback from queue
   */
  private startPlayback(): void {
    if (!this.audioContext || !this.gainNode || this.audioQueue.length === 0) {
      return;
    }

    this._isPlaying = true;
    this.scheduledTime = this.audioContext.currentTime;
    this.emit('start', undefined);

    this.scheduleNextBuffer();
  }

  /**
   * Schedule the next audio buffer for playback
   */
  private scheduleNextBuffer(): void {
    if (!this.audioContext || !this.gainNode) {
      return;
    }

    // Process all queued audio
    while (this.audioQueue.length > 0) {
      const float32Data = this.audioQueue.shift()!;

      // Create audio buffer
      const audioBuffer = this.audioContext.createBuffer(
        AUDIO_CONFIG.CHANNELS,
        float32Data.length,
        AUDIO_CONFIG.OUTPUT_SAMPLE_RATE
      );

      // Copy data to buffer
      audioBuffer.getChannelData(0).set(float32Data);

      // Create buffer source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      // Ensure we never schedule in the past
      const startTime = Math.max(
        this.scheduledTime,
        this.audioContext.currentTime + this.bufferDuration
      );

      source.start(startTime);
      this.scheduledTime = startTime + audioBuffer.duration;

      // Increment pending buffer counter
      this.pendingBufferCount++;

      // Always set onended to handle completion properly
      // Guard against disposed state to prevent errors
      source.onended = () => {
        // Early exit if disposed - prevents errors after cleanup
        if (this._disposed) {
          return;
        }

        this.pendingBufferCount--;

        // Check if there's more audio to play
        if (this.audioQueue.length > 0) {
          // More audio in queue, schedule it
          this.scheduleNextBuffer();
        } else if (this.pendingBufferCount === 0) {
          // No more pending buffers and queue is empty
          this._isPlaying = false;
          this.emit('complete', undefined);
        }
        // If pendingBufferCount > 0, there are still buffers playing
      };
    }
  }

  /**
   * Convert PCM16 Int16 data to Float32
   */
  private pcm16ToFloat32(pcm16Data: ArrayBuffer): Float32Array {
    const dataView = new DataView(pcm16Data);
    const numSamples = pcm16Data.byteLength / 2;
    const float32Array = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      // Read Int16 (little-endian)
      const int16 = dataView.getInt16(i * 2, true);
      // Normalize to -1.0 to 1.0
      float32Array[i] = int16 / 32768;
    }

    return float32Array;
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    this.audioQueue = [];
    this._isPlaying = false;
    this.pendingBufferCount = 0;

    // Reset scheduled time
    if (this.audioContext) {
      this.scheduledTime = this.audioContext.currentTime;
    }

    logger.debug('Audio playback stopped', {
      module: 'audio-streamer',
      action: 'stop',
    });
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Fade out and stop
   */
  fadeOut(duration: number = 0.3): void {
    if (!this.audioContext || !this.gainNode) {
      return;
    }

    const now = this.audioContext.currentTime;
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + duration);

    setTimeout(() => {
      this.stop();
      // Reset volume
      if (this.gainNode) {
        this.gainNode.gain.value = 1.0;
      }
    }, duration * 1000);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Set disposed flag early to prevent callbacks from firing
    this._disposed = true;

    this.stop();

    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.eventHandlers = {};

    logger.info('Audio streamer disposed', {
      module: 'audio-streamer',
      action: 'dispose',
    });
  }
}

/**
 * Check if browser supports audio playback
 */
export function isAudioPlaybackSupported(): boolean {
  return !!(typeof window !== 'undefined' && window.AudioContext && window.AudioWorkletNode);
}
