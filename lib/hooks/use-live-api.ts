/**
 * React hook for Gemini Live API integration
 * Orchestrates audio recording, playback, and Gemini communication
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useInterviewStore,
  selectVisualizerVolume,
  type InterviewStoreState,
} from '@/lib/stores/interview-store';
import { GeminiProxyClient } from '@/lib/gemini/gemini-proxy-client';
import { AudioRecorder, isAudioRecordingSupported } from '@/lib/gemini/audio-recorder';
import { AudioStreamer, isAudioPlaybackSupported } from '@/lib/gemini/audio-streamer';
import {
  getInterviewerPrompt,
  getInterviewStartInstruction,
  type SupportedLanguage,
} from '@/lib/gemini/prompts';
import { createTranscriptEntry, type SessionState } from '@/lib/gemini/types';
import { logger } from '@/lib/utils/logger';
import { BadRequestError } from '@/lib/utils/errors';

// ============================================================
// Types
// ============================================================

export interface UseLiveApiOptions {
  /** Language for the interview */
  language?: SupportedLanguage;
  /** Auto-connect on mount */
  autoConnect?: boolean;
}

export interface UseLiveApiReturn {
  // State
  sessionState: SessionState;
  isConnected: boolean;
  isMicOn: boolean;
  inputVolume: number;
  outputVolume: number;
  visualizerVolume: number;
  transcripts: InterviewStoreState['transcripts'];
  interimUserTranscript: string;
  interimAiTranscript: string;
  elapsedSeconds: number;
  lastError: InterviewStoreState['lastError'];

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMic: () => void;
  sendText: (text: string) => void;

  // Capabilities
  isSupported: boolean;
}

// ============================================================
// Hook
// ============================================================

export function useLiveApi(options: UseLiveApiOptions = {}): UseLiveApiReturn {
  const { language = 'zh-TW', autoConnect = false } = options;

  // Store
  const store = useInterviewStore();
  const visualizerVolume = useInterviewStore(selectVisualizerVolume);

  // Refs for instances
  const clientRef = useRef<GeminiProxyClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check browser support (delayed to avoid SSR hydration mismatch)
  const [isSupported, setIsSupported] = useState(true); // Default true to avoid showing error during SSR

  useEffect(() => {
    // Check actual support on client side
    // Using queueMicrotask to avoid synchronous setState warning in effect
    queueMicrotask(() => {
      const supported = isAudioRecordingSupported() && isAudioPlaybackSupported();
      setIsSupported(supported);
    });
  }, []);

  /**
   * Start the session timer
   */
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      store.incrementTimer();
    }, 1000);
  }, [store]);

  /**
   * Stop the session timer
   * Uses atomic swap to prevent race conditions with multiple calls
   */
  const stopTimer = useCallback(() => {
    const timer = timerRef.current;
    if (timer) {
      timerRef.current = null;
      clearInterval(timer);
    }
  }, []);

  /**
   * Setup event listeners for the Gemini client
   */
  const setupClientEvents = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;

    // State changes
    client.on('stateChange', (state) => {
      store.setSessionState(state);
    });

    // Connection events
    client.on('open', () => {
      startTimer();

      // Trigger AI to start the interview (interviewer introduces themselves first)
      // Small delay to ensure audio streamer is ready
      setTimeout(() => {
        client.sendText(getInterviewStartInstruction(language));
      }, 500);
    });

    client.on('close', () => {
      stopTimer();
    });

    client.on('error', (error) => {
      store.setError(error);
    });

    // Audio events
    client.on('audio', (data) => {
      streamerRef.current?.addPCM16(data);
    });

    // Transcript events
    client.on('inputTranscript', (text, isFinal) => {
      if (isFinal) {
        store.addTranscript(createTranscriptEntry('user', text, true));
        store.setInterimUserTranscript('');
      } else {
        store.setInterimUserTranscript(text);
      }
    });

    client.on('outputTranscript', (text, isFinal) => {
      if (isFinal) {
        store.addTranscript(createTranscriptEntry('ai', text, true));
        store.setInterimAiTranscript('');
      } else {
        store.setInterimAiTranscript(text);
      }
    });

    client.on('turnComplete', () => {
      store.clearInterimTranscripts();
    });

    client.on('interrupted', () => {
      streamerRef.current?.fadeOut();
    });
  }, [language, store, startTimer, stopTimer]);

  /**
   * Setup event listeners for the audio recorder
   */
  const setupRecorderEvents = useCallback(() => {
    const recorder = recorderRef.current;
    const client = clientRef.current;
    if (!recorder || !client) return;

    // Send audio data to Gemini
    recorder.on('data', (base64Chunk) => {
      if (store.isMicOn) {
        client.sendAudio(base64Chunk);
      }
    });

    // Update input volume
    recorder.on('volume', (volume) => {
      if (store.isMicOn) {
        store.setInputVolume(volume);
      }
    });

    recorder.on('error', (error) => {
      store.setError(error);
    });
  }, [store]);

  /**
   * Setup event listeners for the audio streamer
   */
  const setupStreamerEvents = useCallback(() => {
    const streamer = streamerRef.current;
    if (!streamer) return;

    // Update output volume
    streamer.on('volume', (volume) => {
      store.setOutputVolume(volume);
    });

    streamer.on('error', (error) => {
      store.setError(error);
    });
  }, [store]);

  /**
   * Connect to Gemini via WebSocket proxy and start the interview
   * API key stays on server - maximum security
   */
  const connect = useCallback(async () => {
    if (!isSupported) {
      store.setError(new BadRequestError('Browser does not support required audio APIs'));
      return;
    }

    logger.info('Starting interview session via proxy', {
      module: 'use-live-api',
      action: 'connect',
      language,
    });

    // Reset store
    store.reset();
    store.setLanguage(language);
    store.setSessionState('connecting');

    try {
      // Initialize audio streamer first (needs to be ready before receiving audio)
      streamerRef.current = new AudioStreamer();
      await streamerRef.current.initialize();
      setupStreamerEvents();

      // Initialize Gemini proxy client (no API key needed on client!)
      clientRef.current = new GeminiProxyClient();
      setupClientEvents();

      // Connect to Gemini via our secure proxy
      const connectResult = await clientRef.current.connect({
        systemInstruction: getInterviewerPrompt(language),
        responseModalities: ['AUDIO'],
        inputAudioTranscription: true,
        outputAudioTranscription: true,
      });

      if (!connectResult.ok) {
        store.setError(connectResult.error);
        return;
      }

      // Initialize audio recorder
      recorderRef.current = new AudioRecorder();
      setupRecorderEvents();

      // Start recording
      const recordResult = await recorderRef.current.start();
      if (!recordResult.ok) {
        store.setError(recordResult.error);
        clientRef.current?.disconnect();
        return;
      }

      // Resume audio context (for playback)
      await streamerRef.current.resume();

      logger.info('Interview session started', {
        module: 'use-live-api',
        action: 'connect',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Ignore errors caused by React StrictMode unmounting during initialization
      // These are expected in development mode and the second mount will succeed
      if (errorMessage.includes('disposed during initialization')) {
        logger.debug('Ignoring StrictMode unmount during initialization', {
          module: 'use-live-api',
          action: 'connect',
        });
        return;
      }

      logger.error('Failed to start interview', error as Error, {
        module: 'use-live-api',
        action: 'connect',
      });
      // Set error state with proper error type
      if (error instanceof Error && 'code' in error) {
        store.setError(error as Parameters<typeof store.setError>[0]);
      } else {
        store.setError(new BadRequestError(errorMessage || 'Failed to start interview'));
      }
    }
  }, [isSupported, language, store, setupClientEvents, setupRecorderEvents, setupStreamerEvents]);

  /**
   * Clean up all resources (shared between disconnect and unmount)
   */
  const cleanup = useCallback(() => {
    stopTimer();
    recorderRef.current?.dispose();
    recorderRef.current = null;
    streamerRef.current?.dispose();
    streamerRef.current = null;
    clientRef.current?.dispose();
    clientRef.current = null;
  }, [stopTimer]);

  /**
   * Disconnect and clean up
   */
  const disconnect = useCallback(() => {
    logger.info('Ending interview session', {
      module: 'use-live-api',
      action: 'disconnect',
    });
    cleanup();
    store.setSessionState('idle');
  }, [store, cleanup]);

  /**
   * Toggle microphone
   * Note: We toggle store first, then sync recorder via the useEffect below
   */
  const toggleMic = useCallback(() => {
    store.toggleMic();
    // Recorder sync is handled by the useEffect that watches store.isMicOn
  }, [store]);

  /**
   * Send text message
   */
  const sendText = useCallback((text: string) => {
    clientRef.current?.sendText(text);
  }, []);

  // Auto-connect on mount if specified
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
  }, [autoConnect, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Sync mic state with recorder
  useEffect(() => {
    recorderRef.current?.setMuted(!store.isMicOn);
  }, [store.isMicOn]);

  return {
    // State
    sessionState: store.sessionState,
    isConnected:
      store.sessionState === 'listening' ||
      store.sessionState === 'speaking' ||
      store.sessionState === 'processing',
    isMicOn: store.isMicOn,
    inputVolume: store.inputVolume,
    outputVolume: store.outputVolume,
    visualizerVolume,
    transcripts: store.transcripts,
    interimUserTranscript: store.interimUserTranscript,
    interimAiTranscript: store.interimAiTranscript,
    elapsedSeconds: store.elapsedSeconds,
    lastError: store.lastError,

    // Actions
    connect,
    disconnect,
    toggleMic,
    sendText,

    // Capabilities
    isSupported,
  };
}
