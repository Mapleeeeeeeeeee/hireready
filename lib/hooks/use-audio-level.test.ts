import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useAudioLevel,
  FFT_SIZE,
  SMOOTHING_TIME_CONSTANT,
  RMS_NORMALIZATION_DIVISOR,
  LEVEL_CHANGE_THRESHOLD,
} from '@/lib/hooks/use-audio-level';

describe('useAudioLevel', () => {
  // Shared mock state for tracking calls across all instances
  let mockTrackStop: ReturnType<typeof vi.fn>;
  let mockAudioContextClose: ReturnType<typeof vi.fn>;
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let mockResume: ReturnType<typeof vi.fn>;
  let mockContextState: 'running' | 'suspended';

  // Original globals
  let originalNavigator: typeof globalThis.navigator;
  let originalAudioContext: typeof globalThis.AudioContext;
  let originalWindow: typeof globalThis.window;

  const setupMocks = () => {
    // Create fresh mocks
    mockTrackStop = vi.fn();
    mockAudioContextClose = vi.fn();
    mockResume = vi.fn().mockResolvedValue(undefined);
    mockContextState = 'running';

    const mockTrack = {
      stop: mockTrackStop,
      kind: 'audio',
      enabled: true,
    };

    const mockStream = {
      getTracks: () => [mockTrack],
    };

    mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

    // Mock navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        mediaDevices: {
          getUserMedia: mockGetUserMedia,
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock AudioContext as a class constructor
    class MockAudioContext {
      state = mockContextState;
      close = mockAudioContextClose;
      resume = mockResume;

      createAnalyser() {
        return {
          fftSize: 0,
          smoothingTimeConstant: 0,
          frequencyBinCount: FFT_SIZE / 2,
          getByteFrequencyData: vi.fn(),
          connect: vi.fn(),
        };
      }

      createMediaStreamSource() {
        return {
          connect: vi.fn(),
        };
      }
    }

    Object.defineProperty(globalThis, 'AudioContext', {
      value: MockAudioContext,
      writable: true,
      configurable: true,
    });

    // Mock window
    Object.defineProperty(globalThis, 'window', {
      value: {},
      writable: true,
      configurable: true,
    });

    // Mock animation frame
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
  };

  beforeEach(() => {
    // Store originals
    originalNavigator = globalThis.navigator;
    originalAudioContext = globalThis.AudioContext;
    originalWindow = globalThis.window;

    setupMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();

    // Restore originals
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'AudioContext', {
      value: originalAudioContext,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  describe('exported constants', () => {
    it('should export FFT_SIZE as 256', () => {
      expect(FFT_SIZE).toBe(256);
    });

    it('should export SMOOTHING_TIME_CONSTANT as 0.8', () => {
      expect(SMOOTHING_TIME_CONSTANT).toBe(0.8);
    });

    it('should export RMS_NORMALIZATION_DIVISOR as 128', () => {
      expect(RMS_NORMALIZATION_DIVISOR).toBe(128);
    });

    it('should export LEVEL_CHANGE_THRESHOLD as 0.02', () => {
      expect(LEVEL_CHANGE_THRESHOLD).toBe(0.02);
    });
  });

  describe('browser support detection', () => {
    it('should detect browser as supported when all required APIs are available', () => {
      const { result } = renderHook(() => useAudioLevel());

      expect(result.current.isSupported).toBe(true);
    });

    // Note: Cannot test window === undefined because React testing library requires window
    // The isSupported check handles this case in production SSR scenarios

    it('should detect browser as not supported when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useAudioLevel());

      expect(result.current.isSupported).toBe(false);
    });

    it('should detect browser as not supported when mediaDevices is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useAudioLevel());

      expect(result.current.isSupported).toBe(false);
    });

    it('should detect browser as not supported when getUserMedia is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          mediaDevices: {},
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useAudioLevel());

      expect(result.current.isSupported).toBe(false);
    });

    it('should detect browser as not supported when AudioContext is undefined', () => {
      Object.defineProperty(globalThis, 'AudioContext', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useAudioLevel());

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('initial state', () => {
    it('should start with audioLevel of 0', () => {
      const { result } = renderHook(() => useAudioLevel());

      expect(result.current.audioLevel).toBe(0);
    });

    it('should start with isActive false', () => {
      const { result } = renderHook(() => useAudioLevel());

      expect(result.current.isActive).toBe(false);
    });

    it('should start with no error', () => {
      const { result } = renderHook(() => useAudioLevel());

      expect(result.current.error).toBeNull();
    });
  });

  describe('start/stop lifecycle', () => {
    it('should request microphone permission when start is called', async () => {
      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    });

    it('should set isActive to true after successful start', async () => {
      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.isActive).toBe(true);
    });

    it('should set isActive to false when stop is called', async () => {
      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.isActive).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(result.current.isActive).toBe(false);
    });

    it('should reset audioLevel to 0 when stop is called', async () => {
      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        result.current.stop();
      });

      expect(result.current.audioLevel).toBe(0);
    });

    it('should close AudioContext when stop is called', async () => {
      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        result.current.stop();
      });

      expect(mockAudioContextClose).toHaveBeenCalled();
    });

    it('should stop media tracks when stop is called', async () => {
      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        result.current.stop();
      });

      expect(mockTrackStop).toHaveBeenCalled();
    });
  });

  describe('guard against double-start', () => {
    it('should not start twice if already active', async () => {
      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.start();
      });

      // Should still be 1, not 2 (guard by isActive check)
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    });

    it('should not start if browser is not supported', async () => {
      // Remove AudioContext to simulate unsupported browser
      Object.defineProperty(globalThis, 'AudioContext', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      expect(mockGetUserMedia).not.toHaveBeenCalled();
      expect(result.current.isActive).toBe(false);
    });

    it('should guard against concurrent start calls via isStartingRef', async () => {
      const { result } = renderHook(() => useAudioLevel());

      // Start two concurrent calls - the second should be blocked by isStartingRef
      await act(async () => {
        const promise1 = result.current.start();
        const promise2 = result.current.start();
        await Promise.all([promise1, promise2]);
      });

      // Should only call getUserMedia once due to isStartingRef guard
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup on unmount', () => {
    it('should stop media tracks on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      unmount();

      expect(mockTrackStop).toHaveBeenCalled();
    });

    it('should close AudioContext on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      unmount();

      expect(mockAudioContextClose).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should set error when microphone permission is denied', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);

      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.error).toBe(permissionError);
      expect(result.current.isActive).toBe(false);
    });

    it('should set error when microphone is not found', async () => {
      const notFoundError = new Error('Requested device not found');
      notFoundError.name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.error).toBe(notFoundError);
      expect(result.current.isActive).toBe(false);
    });

    it('should wrap non-Error objects in Error', async () => {
      mockGetUserMedia.mockRejectedValue('String error');

      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to access microphone');
    });

    it('should clear error on successful start after previous failure', async () => {
      const permissionError = new Error('Permission denied');
      mockGetUserMedia.mockRejectedValueOnce(permissionError);

      const { result } = renderHook(() => useAudioLevel());

      // First attempt fails
      await act(async () => {
        await result.current.start();
      });

      expect(result.current.error).toBe(permissionError);

      // Reset mock to succeed
      mockGetUserMedia.mockResolvedValueOnce({
        getTracks: () => [{ stop: vi.fn(), kind: 'audio', enabled: true }],
      });

      // Second attempt succeeds
      await act(async () => {
        await result.current.start();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isActive).toBe(true);
    });
  });

  describe('stop behavior', () => {
    it('should be safe to call stop when not started', () => {
      const { result } = renderHook(() => useAudioLevel());

      expect(() => {
        act(() => {
          result.current.stop();
        });
      }).not.toThrow();
    });

    it('should be safe to call stop multiple times', async () => {
      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      expect(() => {
        act(() => {
          result.current.stop();
          result.current.stop();
          result.current.stop();
        });
      }).not.toThrow();
    });
  });

  describe('AudioContext resume', () => {
    it('should resume AudioContext if suspended', async () => {
      // Create a new mock with suspended state
      const suspendedResume = vi.fn().mockResolvedValue(undefined);
      const suspendedClose = vi.fn();

      class SuspendedAudioContext {
        state = 'suspended';
        close = suspendedClose;
        resume = suspendedResume;

        createAnalyser() {
          return {
            fftSize: 0,
            smoothingTimeConstant: 0,
            frequencyBinCount: FFT_SIZE / 2,
            getByteFrequencyData: vi.fn(),
            connect: vi.fn(),
          };
        }

        createMediaStreamSource() {
          return { connect: vi.fn() };
        }
      }

      Object.defineProperty(globalThis, 'AudioContext', {
        value: SuspendedAudioContext,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useAudioLevel());

      await act(async () => {
        await result.current.start();
      });

      expect(suspendedResume).toHaveBeenCalled();
    });
  });
});
