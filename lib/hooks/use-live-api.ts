/**
 * React hook for Gemini Live API integration
 * Orchestrates audio recording, playback, and Gemini communication
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  useInterviewStore,
  selectVisualizerVolume,
  type InterviewStoreState,
} from '@/lib/stores/interview-store';
import { GeminiLiveClient } from '@/lib/gemini/gemini-live-client';
import { AudioRecorder, isAudioRecordingSupported } from '@/lib/gemini/audio-recorder';
import { AudioStreamer, isAudioPlaybackSupported } from '@/lib/gemini/audio-streamer';
import { getInterviewerPrompt, type SupportedLanguage } from '@/lib/gemini/prompts';
import { createTranscriptEntry, type SessionState } from '@/lib/gemini/types';
import { logger } from '@/lib/utils/logger';
import { BadRequestError } from '@/lib/utils/errors';
import { apiGet } from '@/lib/utils/api-client';

// ============================================================
// Session Credentials
// ============================================================

interface SessionCredentials {
  apiKey: string;
  model: string;
  expiresAt: string;
}

/**
 * Fetch session credentials from server (authenticated endpoint)
 */
async function fetchSessionCredentials(): Promise<SessionCredentials> {
  return await apiGet<SessionCredentials>('/api/interview/session');
}

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
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check browser support
  const isSupported =
    typeof window !== 'undefined' && isAudioRecordingSupported() && isAudioPlaybackSupported();

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
    });

    client.on('close', (_code, _reason) => {
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
  }, [store, startTimer, stopTimer]);

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
   * Connect to Gemini and start the interview
   */
  const connect = useCallback(async () => {
    if (!isSupported) {
      store.setError(new BadRequestError('Browser does not support required audio APIs'));
      return;
    }

    logger.info('Starting interview session', {
      module: 'use-live-api',
      action: 'connect',
      language,
    });

    // Reset store
    store.reset();
    store.setLanguage(language);
    store.setSessionState('connecting');

    try {
      // Fetch session credentials from server (requires authentication)
      const credentials = await fetchSessionCredentials();

      logger.debug('Session credentials received', {
        module: 'use-live-api',
        action: 'connect',
        model: credentials.model,
        expiresAt: credentials.expiresAt,
      });

      // Initialize audio streamer first (needs to be ready before receiving audio)
      streamerRef.current = new AudioStreamer();
      await streamerRef.current.initialize();
      setupStreamerEvents();

      // Initialize Gemini client
      clientRef.current = new GeminiLiveClient();
      setupClientEvents();

      // Connect to Gemini
      const connectResult = await clientRef.current.connect(credentials.apiKey, {
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
      logger.error('Failed to start interview', error as Error, {
        module: 'use-live-api',
        action: 'connect',
      });
      // Set error state with proper error type
      if (error instanceof Error && 'code' in error) {
        store.setError(error as Parameters<typeof store.setError>[0]);
      } else {
        store.setError(
          new BadRequestError(error instanceof Error ? error.message : 'Failed to start interview')
        );
      }
    }
  }, [isSupported, language, store, setupClientEvents, setupRecorderEvents, setupStreamerEvents]);

  /**
   * Disconnect and clean up
   */
  const disconnect = useCallback(() => {
    logger.info('Ending interview session', {
      module: 'use-live-api',
      action: 'disconnect',
    });

    stopTimer();

    // Stop recorder
    recorderRef.current?.dispose();
    recorderRef.current = null;

    // Stop streamer
    streamerRef.current?.dispose();
    streamerRef.current = null;

    // Disconnect client
    clientRef.current?.dispose();
    clientRef.current = null;

    store.setSessionState('idle');
  }, [store, stopTimer]);

  /**
   * Toggle microphone
   */
  const toggleMic = useCallback(() => {
    store.toggleMic();
    recorderRef.current?.setMuted(!store.isMicOn);
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
  // Note: Using refs to avoid stale closure issues with cleanup

  useEffect(() => {
    const mountedRef = { current: true };

    return () => {
      if (!mountedRef.current) return;
      mountedRef.current = false;

      // Inline cleanup to avoid dependency on disconnect
      stopTimer();

      // Stop recorder
      recorderRef.current?.dispose();
      recorderRef.current = null;

      // Stop streamer
      streamerRef.current?.dispose();
      streamerRef.current = null;

      // Disconnect client
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, [stopTimer]);

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
