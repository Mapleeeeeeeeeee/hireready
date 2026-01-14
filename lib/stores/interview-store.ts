/**
 * Interview session state management using Zustand
 * Manages the entire interview lifecycle
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { logger } from '@/lib/utils/logger';
import type { SessionState, TranscriptEntry } from '@/lib/gemini/types';
import type { AppError } from '@/lib/utils/errors';
import type { JobDescription } from '@/lib/jd/types';

// ============================================================
// Types
// ============================================================

export interface InterviewStoreState {
  // Session state
  sessionState: SessionState;

  // Audio controls
  isMicOn: boolean;
  isVideoOn: boolean;
  inputVolume: number;
  outputVolume: number;

  // Transcripts
  transcripts: TranscriptEntry[];
  interimUserTranscript: string;
  interimAiTranscript: string;

  // Caption settings (AI captions only)
  isCaptionOn: boolean;

  // Interview metadata
  language: 'en' | 'zh-TW';
  elapsedSeconds: number;

  // Job description (optional)
  jobDescription: JobDescription | null;

  // Error state
  lastError: AppError | null;
}

export interface InterviewStoreActions {
  // Session actions
  setSessionState: (state: SessionState) => void;

  // Audio control actions
  toggleMic: () => void;
  toggleVideo: () => void;
  setMicOn: (on: boolean) => void;
  setInputVolume: (volume: number) => void;
  setOutputVolume: (volume: number) => void;

  // Transcript actions
  addTranscript: (entry: TranscriptEntry) => void;
  setInterimUserTranscript: (text: string) => void;
  setInterimAiTranscript: (text: string) => void;
  clearInterimTranscripts: () => void;

  // Caption actions
  toggleCaption: () => void;

  // Interview metadata actions
  setLanguage: (language: 'en' | 'zh-TW') => void;
  incrementTimer: () => void;
  setJobDescription: (jd: JobDescription | null) => void;

  // Error actions
  setError: (error: AppError | null) => void;

  // Reset
  reset: () => void;
}

export type InterviewStore = InterviewStoreState & InterviewStoreActions;

// ============================================================
// Initial State
// ============================================================

const initialState: InterviewStoreState = {
  sessionState: 'idle',
  isMicOn: true,
  isVideoOn: false,
  inputVolume: 0,
  outputVolume: 0,
  transcripts: [],
  interimUserTranscript: '',
  interimAiTranscript: '',
  isCaptionOn: false,
  language: 'zh-TW',
  elapsedSeconds: 0,
  jobDescription: null,
  lastError: null,
};

// ============================================================
// Store
// ============================================================

export const useInterviewStore = create<InterviewStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Session actions
      setSessionState: (state) => {
        const current = get().sessionState;
        if (current !== state) {
          logger.debug('Session state changed', {
            module: 'interview-store',
            action: 'setSessionState',
            from: current,
            to: state,
          });
          set({ sessionState: state });
        }
      },

      // Audio control actions
      toggleMic: () => {
        const newState = !get().isMicOn;
        logger.info(`Microphone ${newState ? 'enabled' : 'disabled'}`, {
          module: 'interview-store',
          action: 'toggleMic',
        });
        set({ isMicOn: newState });
      },

      toggleVideo: () => {
        const newState = !get().isVideoOn;
        logger.info(`Video ${newState ? 'enabled' : 'disabled'}`, {
          module: 'interview-store',
          action: 'toggleVideo',
        });
        set({ isVideoOn: newState });
      },

      setMicOn: (on) => {
        set({ isMicOn: on });
      },

      setInputVolume: (volume) => {
        set({ inputVolume: Math.max(0, Math.min(1, volume)) });
      },

      setOutputVolume: (volume) => {
        set({ outputVolume: Math.max(0, Math.min(1, volume)) });
      },

      // Transcript actions
      addTranscript: (entry) => {
        logger.debug('Transcript added', {
          module: 'interview-store',
          action: 'addTranscript',
          role: entry.role,
          textLength: entry.text.length,
        });
        set((state) => ({
          transcripts: [...state.transcripts, entry],
        }));
      },

      setInterimUserTranscript: (text) => {
        set({ interimUserTranscript: text });
      },

      setInterimAiTranscript: (text) => {
        set({ interimAiTranscript: text });
      },

      clearInterimTranscripts: () => {
        set({ interimUserTranscript: '', interimAiTranscript: '' });
      },

      // Caption actions
      toggleCaption: () => {
        const newState = !get().isCaptionOn;
        logger.info(`Captions ${newState ? 'enabled' : 'disabled'}`, {
          module: 'interview-store',
          action: 'toggleCaption',
        });
        set({ isCaptionOn: newState });
      },

      // Interview metadata actions
      setLanguage: (language) => {
        logger.info(`Language set to ${language}`, {
          module: 'interview-store',
          action: 'setLanguage',
        });
        set({ language });
      },

      incrementTimer: () => {
        set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
      },

      setJobDescription: (jd) => {
        logger.info('Job description updated', {
          module: 'interview-store',
          action: 'setJobDescription',
          hasJd: jd !== null,
          title: jd?.title,
        });
        set({ jobDescription: jd });
      },

      // Error actions
      setError: (error) => {
        if (error) {
          logger.error('Interview error', error, {
            module: 'interview-store',
            action: 'setError',
            code: error.code,
          });
          set({ lastError: error, sessionState: 'error' });
        } else {
          set({ lastError: null });
        }
      },

      // Reset
      reset: () => {
        logger.info('Interview store reset', {
          module: 'interview-store',
          action: 'reset',
        });
        set(initialState);
      },
    }),
    { name: 'interview-store' }
  )
);

// ============================================================
// Selectors
// ============================================================

/**
 * Select if the session is active (connected)
 */
export const selectIsSessionActive = (state: InterviewStore): boolean => {
  return (
    state.sessionState === 'listening' ||
    state.sessionState === 'speaking' ||
    state.sessionState === 'processing'
  );
};

/**
 * Select the combined volume (max of input and output)
 */
export const selectCombinedVolume = (state: InterviewStore): number => {
  return Math.max(state.inputVolume, state.outputVolume);
};

/**
 * Select the appropriate volume for visualization based on state
 */
export const selectVisualizerVolume = (state: InterviewStore): number => {
  switch (state.sessionState) {
    case 'listening':
    case 'processing':
      return state.inputVolume;
    case 'speaking':
      return state.outputVolume;
    default:
      return 0;
  }
};

/**
 * Select formatted elapsed time
 */
export const selectFormattedTime = (state: InterviewStore): string => {
  const mins = Math.floor(state.elapsedSeconds / 60);
  const secs = state.elapsedSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
