import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Session state type
type SessionState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'processing' | 'error';

// Create mock store state
const createMockStore = () => ({
  sessionState: 'idle' as SessionState,
  isMicOn: true,
  inputVolume: 0,
  outputVolume: 0,
  transcripts: [] as Array<{ id: string; role: string; text: string }>,
  interimUserTranscript: '',
  interimAiTranscript: '',
  elapsedSeconds: 0,
  lastError: null as Error | null,
  language: 'zh-TW',
  reset: vi.fn(),
  setLanguage: vi.fn(),
  setSessionState: vi.fn(),
  setError: vi.fn(),
  setInputVolume: vi.fn(),
  setOutputVolume: vi.fn(),
  addTranscript: vi.fn(),
  setInterimUserTranscript: vi.fn(),
  setInterimAiTranscript: vi.fn(),
  clearInterimTranscripts: vi.fn(),
  incrementTimer: vi.fn(),
  toggleMic: vi.fn(),
});

let mockStore = createMockStore();

// Mock dependencies
vi.mock('@/lib/stores/interview-store', () => ({
  useInterviewStore: (selector?: (state: typeof mockStore) => unknown) => {
    if (selector) {
      return selector(mockStore);
    }
    return mockStore;
  },
  selectVisualizerVolume: () => 0,
}));

// Mock audio support functions
const mockIsAudioRecordingSupported = vi.fn().mockReturnValue(true);
const mockIsAudioPlaybackSupported = vi.fn().mockReturnValue(true);

// Mock recorder
const mockRecorderOn = vi.fn();
const mockRecorderStart = vi.fn().mockResolvedValue({ ok: true });
const mockRecorderDispose = vi.fn();
const mockRecorderSetMuted = vi.fn();

vi.mock('@/lib/gemini/audio-recorder', () => ({
  AudioRecorder: vi.fn().mockImplementation(() => ({
    on: mockRecorderOn,
    start: mockRecorderStart,
    dispose: mockRecorderDispose,
    setMuted: mockRecorderSetMuted,
  })),
  isAudioRecordingSupported: () => mockIsAudioRecordingSupported(),
}));

// Mock streamer
const mockStreamerOn = vi.fn();
const mockStreamerInitialize = vi.fn().mockResolvedValue(undefined);
const mockStreamerResume = vi.fn().mockResolvedValue(undefined);
const mockStreamerDispose = vi.fn();

vi.mock('@/lib/gemini/audio-streamer', () => ({
  AudioStreamer: vi.fn().mockImplementation(() => ({
    on: mockStreamerOn,
    initialize: mockStreamerInitialize,
    resume: mockStreamerResume,
    dispose: mockStreamerDispose,
    addPCM16: vi.fn(),
    fadeOut: vi.fn(),
  })),
  isAudioPlaybackSupported: () => mockIsAudioPlaybackSupported(),
}));

// Mock client
const mockClientOn = vi.fn();
const mockClientConnect = vi.fn().mockResolvedValue({ ok: true });
const mockClientDispose = vi.fn();
const mockClientSendText = vi.fn();

vi.mock('@/lib/gemini/gemini-proxy-client', () => ({
  GeminiProxyClient: vi.fn().mockImplementation(() => ({
    on: mockClientOn,
    connect: mockClientConnect,
    dispose: mockClientDispose,
    sendText: mockClientSendText,
    sendAudio: vi.fn(),
  })),
}));

vi.mock('@/lib/gemini/prompts', () => ({
  getInterviewerPrompt: vi.fn().mockReturnValue('system prompt'),
  getInterviewStartInstruction: vi.fn().mockReturnValue('start instruction'),
}));

vi.mock('@/lib/gemini/types', () => ({
  createTranscriptEntry: vi.fn((role, text, isFinal) => ({
    id: 'mock-id',
    role,
    text,
    isFinal,
    timestamp: Date.now(),
  })),
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocks
import { useLiveApi } from '@/lib/hooks/use-live-api';

describe('useLiveApi', () => {
  let originalQueueMicrotask: typeof queueMicrotask;

  beforeEach(() => {
    vi.useFakeTimers();
    originalQueueMicrotask = globalThis.queueMicrotask;
    globalThis.queueMicrotask = (cb: () => void) => cb();

    // Reset all mocks
    vi.clearAllMocks();
    mockStore = createMockStore();

    // Reset support mocks
    mockIsAudioRecordingSupported.mockReturnValue(true);
    mockIsAudioPlaybackSupported.mockReturnValue(true);

    // Reset connect mock
    mockClientConnect.mockResolvedValue({ ok: true });
    mockRecorderStart.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    globalThis.queueMicrotask = originalQueueMicrotask;
  });

  describe('browser support detection', () => {
    it('should return isSupported true when all APIs are available', () => {
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.isSupported).toBe(true);
    });

    it('should return isSupported false when audio recording not supported', () => {
      mockIsAudioRecordingSupported.mockReturnValue(false);
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.isSupported).toBe(false);
    });

    it('should return isSupported false when audio playback not supported', () => {
      mockIsAudioPlaybackSupported.mockReturnValue(false);
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('initial state', () => {
    it('should return idle sessionState initially', () => {
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.sessionState).toBe('idle');
    });

    it('should return isConnected false initially', () => {
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.isConnected).toBe(false);
    });

    it('should return isMicOn true initially', () => {
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.isMicOn).toBe(true);
    });

    it('should return empty transcripts initially', () => {
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.transcripts).toEqual([]);
    });

    it('should return elapsedSeconds 0 initially', () => {
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.elapsedSeconds).toBe(0);
    });

    it('should return lastError null initially', () => {
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.lastError).toBeNull();
    });
  });

  describe('connect flow', () => {
    it('should reset store before connecting', async () => {
      const { result } = renderHook(() => useLiveApi());

      await act(async () => {
        await result.current.connect();
      });

      expect(mockStore.reset).toHaveBeenCalled();
    });

    it('should set language in store', async () => {
      const { result } = renderHook(() => useLiveApi({ language: 'en' }));

      await act(async () => {
        await result.current.connect();
      });

      expect(mockStore.setLanguage).toHaveBeenCalledWith('en');
    });

    it('should set sessionState to connecting', async () => {
      const { result } = renderHook(() => useLiveApi());

      await act(async () => {
        await result.current.connect();
      });

      expect(mockStore.setSessionState).toHaveBeenCalledWith('connecting');
    });
  });

  describe('connect error handling', () => {
    it('should set error when browser not supported', async () => {
      mockIsAudioRecordingSupported.mockReturnValue(false);

      const { result } = renderHook(() => useLiveApi());

      await act(async () => {
        await result.current.connect();
      });

      expect(mockStore.setError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Browser does not support required audio APIs',
        })
      );
    });
  });

  describe('disconnect flow', () => {
    it('should set sessionState to idle', async () => {
      const { result } = renderHook(() => useLiveApi());

      await act(async () => {
        await result.current.connect();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(mockStore.setSessionState).toHaveBeenLastCalledWith('idle');
    });
  });

  describe('toggleMic', () => {
    it('should toggle mic state in store', () => {
      const { result } = renderHook(() => useLiveApi());

      act(() => {
        result.current.toggleMic();
      });

      expect(mockStore.toggleMic).toHaveBeenCalled();
    });
  });

  describe('sendText', () => {
    it('should handle null client gracefully', () => {
      const { result } = renderHook(() => useLiveApi());

      expect(() => {
        act(() => {
          result.current.sendText('Hello');
        });
      }).not.toThrow();
    });
  });

  describe('isConnected derived state', () => {
    it('should return true when sessionState is listening', () => {
      mockStore.sessionState = 'listening';
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.isConnected).toBe(true);
    });

    it('should return true when sessionState is speaking', () => {
      mockStore.sessionState = 'speaking';
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.isConnected).toBe(true);
    });

    it('should return true when sessionState is processing', () => {
      mockStore.sessionState = 'processing';
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.isConnected).toBe(true);
    });

    it('should return false when sessionState is idle', () => {
      mockStore.sessionState = 'idle';
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.isConnected).toBe(false);
    });

    it('should return false when sessionState is connecting', () => {
      mockStore.sessionState = 'connecting';
      const { result } = renderHook(() => useLiveApi());
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('cleanup on unmount', () => {
    it('should not throw on unmount without connection', () => {
      const { unmount } = renderHook(() => useLiveApi());

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('autoConnect option', () => {
    it('should auto-connect on mount when autoConnect is true', async () => {
      renderHook(() => useLiveApi({ autoConnect: true }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockStore.reset).toHaveBeenCalled();
    });

    it('should not auto-connect when autoConnect is false', async () => {
      renderHook(() => useLiveApi({ autoConnect: false }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockStore.reset).not.toHaveBeenCalled();
    });
  });
});
