/**
 * Gemini Live API type definitions
 */

import type { AppError } from '@/lib/utils/errors';

// ============================================================
// Session States
// ============================================================

/**
 * Interview session state machine states
 */
export type SessionState =
  | 'idle' // Initial state, ready to connect
  | 'connecting' // Establishing WebSocket connection
  | 'listening' // Connected, waiting for user input
  | 'speaking' // AI is responding with audio
  | 'processing' // Processing user input
  | 'error'; // Error state

/**
 * Check if session is active (connected)
 */
export function isSessionActive(state: SessionState): boolean {
  return state === 'listening' || state === 'speaking' || state === 'processing';
}

// ============================================================
// Configuration
// ============================================================

/**
 * Audio configuration constants
 */
export const AUDIO_CONFIG = {
  /** Input sample rate required by Gemini (16kHz) */
  INPUT_SAMPLE_RATE: 16000,
  /** Output sample rate from Gemini (24kHz) */
  OUTPUT_SAMPLE_RATE: 24000,
  /** Number of audio channels (mono) */
  CHANNELS: 1,
  /** Bits per sample */
  BITS_PER_SAMPLE: 16,
  /** Audio chunk size for recording (samples) */
  CHUNK_SIZE: 4096,
  /** Buffer size for playback (samples) */
  PLAYBACK_BUFFER_SIZE: 7680,
} as const;

/**
 * Gemini Live API configuration
 */
export interface GeminiLiveConfig {
  /** Model identifier */
  model: string;
  /** System instruction for the AI */
  systemInstruction: string;
  /** Response modalities */
  responseModalities: Array<'TEXT' | 'AUDIO'>;
  /** Voice configuration */
  voiceConfig?: {
    voiceName?: string;
    languageCode?: string;
  };
  /** Input audio transcription */
  inputAudioTranscription?: boolean;
  /** Output audio transcription */
  outputAudioTranscription?: boolean;
}

/**
 * Default Gemini configuration
 */
/**
 * Live API compatible model - use this for real-time audio streaming
 * Only this model supports bidiGenerateContent (WebSocket streaming)
 * @see https://ai.google.dev/gemini-api/docs/models
 */
export const LIVE_API_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

export const DEFAULT_GEMINI_CONFIG: Partial<GeminiLiveConfig> = {
  model: LIVE_API_MODEL,
  responseModalities: ['AUDIO'],
  inputAudioTranscription: true,
  outputAudioTranscription: true,
};

// ============================================================
// Transcript
// ============================================================

/**
 * A single transcript entry (user or AI)
 */
export interface TranscriptEntry {
  /** Unique identifier */
  id: string;
  /** Role of the speaker */
  role: 'user' | 'ai';
  /** Transcript text */
  text: string;
  /** Timestamp when this was recorded */
  timestamp: number;
  /** Whether this is a final transcript (not interim) */
  isFinal: boolean;
}

/**
 * Create a new transcript entry
 */
export function createTranscriptEntry(
  role: 'user' | 'ai',
  text: string,
  isFinal: boolean = true
): TranscriptEntry {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: Date.now(),
    isFinal,
  };
}

// ============================================================
// Events
// ============================================================

/**
 * Gemini client event types
 */
export interface GeminiClientEvents {
  /** WebSocket connection opened */
  open: () => void;
  /** WebSocket connection closed */
  close: (code: number, reason: string) => void;
  /** Error occurred */
  error: (error: AppError) => void;
  /** Audio data received from AI */
  audio: (data: ArrayBuffer) => void;
  /** Text response received from AI */
  text: (text: string) => void;
  /** AI turn complete */
  turnComplete: () => void;
  /** AI was interrupted */
  interrupted: () => void;
  /** User input transcription received */
  inputTranscript: (text: string, isFinal: boolean) => void;
  /** AI output transcription received */
  outputTranscript: (text: string, isFinal: boolean) => void;
  /** Session state changed */
  stateChange: (state: SessionState) => void;
}

/**
 * Event emitter type helper
 */
export type GeminiEventHandler<K extends keyof GeminiClientEvents> = GeminiClientEvents[K];

// ============================================================
// Audio Recorder Events
// ============================================================

/**
 * Audio recorder event types
 */
export interface AudioRecorderEvents {
  /** Audio data available (base64 encoded) */
  data: (base64Chunk: string) => void;
  /** Volume level update (0-1) */
  volume: (level: number) => void;
  /** Recording started */
  start: () => void;
  /** Recording stopped */
  stop: () => void;
  /** Error occurred */
  error: (error: AppError) => void;
}

// ============================================================
// Audio Streamer Events
// ============================================================

/**
 * Audio streamer event types
 */
export interface AudioStreamerEvents {
  /** Volume level update (0-1) */
  volume: (level: number) => void;
  /** Playback started */
  start: () => void;
  /** Playback completed */
  complete: () => void;
  /** Error occurred */
  error: (error: AppError) => void;
}

// ============================================================
// Interview Data
// ============================================================

/**
 * Complete interview session data (for saving)
 */
export interface InterviewData {
  /** User ID */
  userId: string;
  /** Interview scenario */
  scenario: string;
  /** Interview status */
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  /** Duration in seconds */
  duration: number;
  /** Conversation transcripts */
  transcripts: TranscriptEntry[];
  /** AI-generated feedback */
  feedback?: string;
  /** Language used */
  language: 'en' | 'zh-TW';
}

/**
 * Interview save request
 */
export interface SaveInterviewRequest {
  transcripts: TranscriptEntry[];
  duration: number;
  feedback?: string;
  language: 'en' | 'zh-TW';
}

/**
 * Interview save response
 */
export interface SaveInterviewResponse {
  id: string;
  createdAt: string;
}
