import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVideoPreview } from '@/lib/hooks/use-video-preview';

describe('useVideoPreview', () => {
  // Shared mock state
  let mockTrackStop: ReturnType<typeof vi.fn>;
  let mockGetUserMedia: ReturnType<typeof vi.fn>;

  // Original globals
  let originalNavigator: typeof globalThis.navigator;

  const createMockStream = () => {
    mockTrackStop = vi.fn();
    const mockTrack = {
      stop: mockTrackStop,
      kind: 'video',
      enabled: true,
    };
    return {
      getTracks: () => [mockTrack],
    };
  };

  const setupMocks = () => {
    const mockStream = createMockStream();
    mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        mediaDevices: {
          getUserMedia: mockGetUserMedia,
        },
      },
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
    setupMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();

    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('browser support detection', () => {
    it('should detect browser as supported when all required APIs are available', () => {
      const { result } = renderHook(() => useVideoPreview());

      expect(result.current.isSupported).toBe(true);
    });

    it('should detect browser as not supported when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useVideoPreview());

      expect(result.current.isSupported).toBe(false);
    });

    it('should detect browser as not supported when mediaDevices is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useVideoPreview());

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

      const { result } = renderHook(() => useVideoPreview());

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('initial state', () => {
    it('should start with isVideoOn false', () => {
      const { result } = renderHook(() => useVideoPreview());

      expect(result.current.isVideoOn).toBe(false);
    });

    it('should start with stream null', () => {
      const { result } = renderHook(() => useVideoPreview());

      expect(result.current.stream).toBeNull();
    });

    it('should start with error null', () => {
      const { result } = renderHook(() => useVideoPreview());

      expect(result.current.error).toBeNull();
    });
  });

  describe('toggleVideo lifecycle', () => {
    it('should request camera permission when toggling on', async () => {
      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    });

    it('should set isVideoOn true after successful start', async () => {
      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.isVideoOn).toBe(true);
    });

    it('should set stream with media stream after successful start', async () => {
      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.stream).not.toBeNull();
      expect(result.current.stream?.getTracks).toBeDefined();
    });

    it('should stop all tracks when toggling off', async () => {
      const { result } = renderHook(() => useVideoPreview());

      // Turn on
      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.isVideoOn).toBe(true);

      // Turn off
      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(mockTrackStop).toHaveBeenCalled();
    });

    it('should set stream to null when toggling off', async () => {
      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.stream).not.toBeNull();

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.stream).toBeNull();
    });

    it('should set isVideoOn false when toggling off', async () => {
      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.isVideoOn).toBe(true);

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.isVideoOn).toBe(false);
    });
  });

  describe('camera constraints', () => {
    it('should request video only (no audio)', async () => {
      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: false,
        })
      );
    });

    it('should request user-facing camera', async () => {
      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            facingMode: 'user',
          }),
        })
      );
    });

    it('should request ideal resolution of 640x480', async () => {
      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            width: { ideal: 640 },
            height: { ideal: 480 },
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should set error when camera permission denied', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);

      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.error).toBe(permissionError);
      expect(result.current.isVideoOn).toBe(false);
    });

    it('should set error when camera not found', async () => {
      const notFoundError = new Error('Requested device not found');
      notFoundError.name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.error).toBe(notFoundError);
      expect(result.current.isVideoOn).toBe(false);
    });

    it('should wrap non-Error objects in Error', async () => {
      mockGetUserMedia.mockRejectedValue('String error');

      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to access camera');
    });

    it('should set error when browser not supported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Camera not supported in this browser');
    });

    it('should clear error on successful start after previous failure', async () => {
      const permissionError = new Error('Permission denied');
      mockGetUserMedia.mockRejectedValueOnce(permissionError);

      const { result } = renderHook(() => useVideoPreview());

      // First attempt fails
      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.error).toBe(permissionError);

      // Reset mock to succeed
      const newMockStream = createMockStream();
      mockGetUserMedia.mockResolvedValueOnce(newMockStream);

      // Second attempt succeeds
      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isVideoOn).toBe(true);
    });
  });

  describe('cleanup on unmount', () => {
    it('should stop all tracks on unmount', async () => {
      const { result, unmount } = renderHook(() => useVideoPreview());

      await act(async () => {
        await result.current.toggleVideo();
      });

      expect(result.current.isVideoOn).toBe(true);

      unmount();

      expect(mockTrackStop).toHaveBeenCalled();
    });

    it('should not cause errors when unmounting with no stream', () => {
      const { unmount } = renderHook(() => useVideoPreview());

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('toggle behavior', () => {
    it('should toggle correctly in sequence', async () => {
      const { result } = renderHook(() => useVideoPreview());

      // Initially off
      expect(result.current.isVideoOn).toBe(false);

      // Toggle on
      await act(async () => {
        await result.current.toggleVideo();
      });
      expect(result.current.isVideoOn).toBe(true);

      // Toggle off
      await act(async () => {
        await result.current.toggleVideo();
      });
      expect(result.current.isVideoOn).toBe(false);

      // Toggle on again
      const newMockStream = createMockStream();
      mockGetUserMedia.mockResolvedValueOnce(newMockStream);

      await act(async () => {
        await result.current.toggleVideo();
      });
      expect(result.current.isVideoOn).toBe(true);
    });
  });
});
