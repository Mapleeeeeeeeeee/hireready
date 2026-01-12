/**
 * Audio recorder module for capturing microphone input
 * Outputs PCM16 audio data suitable for Gemini Live API
 */

import { logger } from '@/lib/utils/logger';
import { AudioPermissionError, AudioContextError } from '@/lib/utils/errors';
import { withErrorHandling, Result, Ok, Err } from '@/lib/utils/result';
import { AUDIO_CONFIG, type AudioRecorderEvents } from './types';

type EventCallback<T> = (data: T) => void;

/**
 * Audio recorder class for microphone capture
 */
export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private _isRecording = false;
  private _isMuted = false;

  // Event handlers
  private eventHandlers: {
    [K in keyof AudioRecorderEvents]?: Array<EventCallback<Parameters<AudioRecorderEvents[K]>[0]>>;
  } = {};

  /**
   * Check if recording is active
   */
  get isRecording(): boolean {
    return this._isRecording;
  }

  /**
   * Check if microphone is muted
   */
  get isMuted(): boolean {
    return this._isMuted;
  }

  /**
   * Subscribe to events
   */
  on<K extends keyof AudioRecorderEvents>(event: K, callback: AudioRecorderEvents[K]): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event]!.push(callback as EventCallback<unknown>);
  }

  /**
   * Unsubscribe from events
   */
  off<K extends keyof AudioRecorderEvents>(event: K, callback: AudioRecorderEvents[K]): void {
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
  private emit<K extends keyof AudioRecorderEvents>(
    event: K,
    data: Parameters<AudioRecorderEvents[K]>[0]
  ): void {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * Start recording from microphone
   */
  start = withErrorHandling(
    async (): Promise<void> => {
      if (this._isRecording) {
        logger.warn('Recording already in progress', {
          module: 'audio-recorder',
          action: 'start',
        });
        return;
      }

      // Request microphone permission
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: AUDIO_CONFIG.INPUT_SAMPLE_RATE,
            channelCount: AUDIO_CONFIG.CHANNELS,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (error) {
        throw new AudioPermissionError(error as Error);
      }

      // Create AudioContext
      try {
        this.audioContext = new AudioContext({
          sampleRate: AUDIO_CONFIG.INPUT_SAMPLE_RATE,
        });

        // Resume AudioContext if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      } catch (error) {
        throw new AudioContextError(`Failed to create AudioContext: ${(error as Error).message}`);
      }

      // Load AudioWorklet processor
      try {
        await this.audioContext.audioWorklet.addModule('/worklets/audio-processor.js');
      } catch (error) {
        throw new AudioContextError(`Failed to load audio worklet: ${(error as Error).message}`);
      }

      // Create audio nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-recorder-processor');

      // Handle messages from worklet
      this.workletNode.port.onmessage = (event) => {
        const { type, audio, volume } = event.data;

        if (type === 'audio' && !this._isMuted) {
          // Convert ArrayBuffer to base64
          const base64 = this.arrayBufferToBase64(audio);
          this.emit('data', base64);
        } else if (type === 'volume') {
          this.emit('volume', volume);
        }
      };

      // Connect nodes
      this.sourceNode.connect(this.workletNode);
      // Don't connect to destination - we only want to record, not play back

      this._isRecording = true;
      this.emit('start', undefined);

      logger.info('Audio recording started', {
        module: 'audio-recorder',
        action: 'start',
        sampleRate: this.audioContext.sampleRate,
      });
    },
    { module: 'audio-recorder', action: 'start' }
  );

  /**
   * Stop recording
   */
  stop(): void {
    if (!this._isRecording) {
      return;
    }

    // Stop worklet - Fix #5: Clean up MessagePort handler to prevent memory leak
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'stop' });
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    // Stop source node
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Stop media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Close AudioContext
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this._isRecording = false;
    this.emit('stop', undefined);

    logger.info('Audio recording stopped', {
      module: 'audio-recorder',
      action: 'stop',
    });
  }

  /**
   * Mute/unmute the microphone (stops sending audio but keeps recording)
   */
  setMuted(muted: boolean): void {
    this._isMuted = muted;

    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: muted ? 'stop' : 'start',
      });
    }

    logger.debug(`Microphone ${muted ? 'muted' : 'unmuted'}`, {
      module: 'audio-recorder',
      action: 'setMuted',
    });
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this.setMuted(!this._isMuted);
    return this._isMuted;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.eventHandlers = {};
  }
}

/**
 * Check if browser supports required audio APIs
 */
export function isAudioRecordingSupported(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    window.AudioContext &&
    window.AudioWorkletNode
  );
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<Result<boolean>> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately - we just wanted to check permission
    stream.getTracks().forEach((track) => track.stop());
    return Ok(true);
  } catch (error) {
    return Err(new AudioPermissionError(error as Error));
  }
}
