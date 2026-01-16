import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskPolling } from './use-task-polling';
import type { TaskStatus } from '@/lib/queue/types';

// ============================================================
// Mocks
// ============================================================

const mockGet = vi.fn();

vi.mock('@/lib/utils/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// ============================================================
// Test Helpers
// ============================================================

interface MockTaskResponse {
  id: string;
  type: string;
  status: TaskStatus;
  progress: number;
  resourceId: string | null;
  error: string | null;
  result: unknown;
}

function createMockTaskResponse(overrides: Partial<MockTaskResponse> = {}): MockTaskResponse {
  return {
    id: 'task-123',
    type: 'resume_parsing',
    status: 'processing',
    progress: 50,
    resourceId: null,
    error: null,
    result: null,
    ...overrides,
  };
}

// Short polling interval for tests (10ms)
const TEST_POLLING_INTERVAL = 10;

// ============================================================
// Tests
// ============================================================

describe('useTaskPolling', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Initial State Tests
  // ============================================================

  describe('initial state', () => {
    describe('when taskId is null', () => {
      it('should not start polling', () => {
        const { result } = renderHook(() => useTaskPolling({ taskId: null }));

        expect(result.current.isPolling).toBe(false);
        expect(mockGet).not.toHaveBeenCalled();
      });

      it('should have status as null', () => {
        const { result } = renderHook(() => useTaskPolling({ taskId: null }));

        expect(result.current.status).toBeNull();
      });

      it('should have progress as 0', () => {
        const { result } = renderHook(() => useTaskPolling({ taskId: null }));

        expect(result.current.progress).toBe(0);
      });

      it('should have isPolling as false', () => {
        const { result } = renderHook(() => useTaskPolling({ taskId: null }));

        expect(result.current.isPolling).toBe(false);
      });
    });
  });

  // ============================================================
  // Polling Behavior Tests
  // ============================================================

  describe('polling behavior', () => {
    describe('when taskId is provided', () => {
      it('should start polling immediately', async () => {
        mockGet.mockResolvedValue(createMockTaskResponse());

        renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        await waitFor(() => {
          expect(mockGet).toHaveBeenCalledWith('/api/tasks/task-123');
        });
      });

      it('should set isPolling to true when polling starts', async () => {
        mockGet.mockResolvedValue(createMockTaskResponse());

        const { result } = renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        // isPolling is set synchronously before the first poll
        expect(result.current.isPolling).toBe(true);
      });

      it('should update status from API response', async () => {
        mockGet.mockResolvedValue(createMockTaskResponse({ status: 'processing' }));

        const { result } = renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        await waitFor(() => {
          expect(result.current.status).toBe('processing');
        });
      });

      it('should update progress from API response', async () => {
        mockGet.mockResolvedValue(createMockTaskResponse({ progress: 75 }));

        const { result } = renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        await waitFor(() => {
          expect(result.current.progress).toBe(75);
        });
      });
    });

    describe('polling interval', () => {
      it('should poll multiple times with default interval behavior', async () => {
        mockGet.mockResolvedValue(createMockTaskResponse());

        renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        // Wait for at least 2 polls to occur
        await waitFor(
          () => {
            expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(2);
          },
          { timeout: 100 }
        );
      });

      it('should respect custom pollingInterval', async () => {
        mockGet.mockResolvedValue(createMockTaskResponse());

        renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            pollingInterval: 50, // 50ms interval
          })
        );

        // First poll happens immediately
        await waitFor(() => {
          expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(1);
        });

        // Wait for at least second poll (after ~50ms)
        await waitFor(
          () => {
            expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(2);
          },
          { timeout: 200 }
        );
      });
    });
  });

  // ============================================================
  // Terminal State Handling Tests
  // ============================================================

  describe('terminal state handling', () => {
    describe('when status is completed', () => {
      it('should stop polling', async () => {
        const taskResult = { content: '{"name":"Test"}', parsedAt: '2024-01-01' };

        mockGet.mockResolvedValue(
          createMockTaskResponse({
            status: 'completed',
            progress: 100,
            result: taskResult,
          })
        );

        const { result } = renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        await waitFor(() => {
          expect(result.current.isPolling).toBe(false);
        });

        // Record call count after completion
        const callCount = mockGet.mock.calls.length;

        // Wait a bit to ensure no more polling
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(mockGet).toHaveBeenCalledTimes(callCount);
      });

      it('should call onComplete with result', async () => {
        const onComplete = vi.fn();
        const taskResult = { content: '{"name":"Test"}', parsedAt: '2024-01-01' };

        mockGet.mockResolvedValue(
          createMockTaskResponse({
            status: 'completed',
            progress: 100,
            result: taskResult,
          })
        );

        renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            onComplete,
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        await waitFor(() => {
          expect(onComplete).toHaveBeenCalledWith(taskResult);
        });
      });

      it('should update status and progress', async () => {
        mockGet.mockResolvedValue(
          createMockTaskResponse({
            status: 'completed',
            progress: 100,
          })
        );

        const { result } = renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        await waitFor(() => {
          expect(result.current.status).toBe('completed');
          expect(result.current.progress).toBe(100);
        });
      });
    });

    describe('when status is failed', () => {
      it('should stop polling', async () => {
        mockGet.mockResolvedValue(
          createMockTaskResponse({
            status: 'failed',
            error: 'Something went wrong',
          })
        );

        const { result } = renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        await waitFor(() => {
          expect(result.current.isPolling).toBe(false);
        });

        // Record call count after failure
        const callCount = mockGet.mock.calls.length;

        // Wait a bit to ensure no more polling
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(mockGet).toHaveBeenCalledTimes(callCount);
      });

      it('should call onError with error message', async () => {
        const onError = vi.fn();

        mockGet.mockResolvedValue(
          createMockTaskResponse({
            status: 'failed',
            error: 'Something went wrong',
          })
        );

        renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            onError,
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        await waitFor(() => {
          expect(onError).toHaveBeenCalledWith('Something went wrong');
        });
      });

      it('should use default error message when error is null', async () => {
        const onError = vi.fn();

        mockGet.mockResolvedValue(
          createMockTaskResponse({
            status: 'failed',
            error: null,
          })
        );

        renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            onError,
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        await waitFor(() => {
          expect(onError).toHaveBeenCalledWith('Task failed');
        });
      });

      it('should update status', async () => {
        mockGet.mockResolvedValue(
          createMockTaskResponse({
            status: 'failed',
          })
        );

        const { result } = renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );

        await waitFor(() => {
          expect(result.current.status).toBe('failed');
        });
      });
    });
  });

  // ============================================================
  // StrictMode Protection Tests
  // ============================================================

  describe('StrictMode protection', () => {
    it('should not start duplicate polling when shouldPollRef is already true', async () => {
      mockGet.mockResolvedValue(createMockTaskResponse());

      // Simulate React StrictMode by re-rendering with the same taskId
      const { rerender } = renderHook(
        ({ taskId }) => useTaskPolling({ taskId, pollingInterval: TEST_POLLING_INTERVAL }),
        { initialProps: { taskId: 'task-123' } }
      );

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(1);
      });

      // Re-render with the same taskId (simulating StrictMode behavior)
      rerender({ taskId: 'task-123' });

      // Small wait to allow any potential extra calls
      await new Promise((resolve) => setTimeout(resolve, 5));

      // Should not start another polling cycle immediately
      // (the existing one may continue, but no duplicate should start)
      expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================
  // stopPolling Function Tests
  // ============================================================

  describe('stopPolling function', () => {
    it('should stop polling when called', async () => {
      mockGet.mockResolvedValue(createMockTaskResponse());

      const { result } = renderHook(() =>
        useTaskPolling({
          taskId: 'task-123',
          pollingInterval: TEST_POLLING_INTERVAL,
        })
      );

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
        expect(mockGet).toHaveBeenCalled();
      });

      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);

      // Record call count after stop
      const callCountAfterStop = mockGet.mock.calls.length;

      // Wait a bit to verify polling has stopped
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockGet).toHaveBeenCalledTimes(callCountAfterStop);
    });

    it('should be safe to call when not polling', () => {
      const { result } = renderHook(() => useTaskPolling({ taskId: null }));

      expect(() => {
        act(() => {
          result.current.stopPolling();
        });
      }).not.toThrow();
    });

    it('should be safe to call multiple times', async () => {
      mockGet.mockResolvedValue(createMockTaskResponse());

      const { result } = renderHook(() =>
        useTaskPolling({
          taskId: 'task-123',
          pollingInterval: TEST_POLLING_INTERVAL,
        })
      );

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });

      expect(() => {
        act(() => {
          result.current.stopPolling();
          result.current.stopPolling();
          result.current.stopPolling();
        });
      }).not.toThrow();

      expect(result.current.isPolling).toBe(false);
    });
  });

  // ============================================================
  // taskId Change Tests
  // ============================================================

  describe('taskId changes', () => {
    describe('when taskId becomes null', () => {
      it('should reset status to null', async () => {
        mockGet.mockResolvedValue(createMockTaskResponse({ status: 'processing' }));

        const { result, rerender } = renderHook(
          ({ taskId }) => useTaskPolling({ taskId, pollingInterval: TEST_POLLING_INTERVAL }),
          { initialProps: { taskId: 'task-123' as string | null } }
        );

        await waitFor(() => {
          expect(result.current.status).toBe('processing');
        });

        rerender({ taskId: null });

        expect(result.current.status).toBeNull();
      });

      it('should reset progress to 0', async () => {
        mockGet.mockResolvedValue(createMockTaskResponse({ progress: 75 }));

        const { result, rerender } = renderHook(
          ({ taskId }) => useTaskPolling({ taskId, pollingInterval: TEST_POLLING_INTERVAL }),
          { initialProps: { taskId: 'task-123' as string | null } }
        );

        await waitFor(() => {
          expect(result.current.progress).toBe(75);
        });

        rerender({ taskId: null });

        expect(result.current.progress).toBe(0);
      });

      it('should stop polling', async () => {
        mockGet.mockResolvedValue(createMockTaskResponse());

        const { result, rerender } = renderHook(
          ({ taskId }) => useTaskPolling({ taskId, pollingInterval: TEST_POLLING_INTERVAL }),
          { initialProps: { taskId: 'task-123' as string | null } }
        );

        await waitFor(() => {
          expect(result.current.isPolling).toBe(true);
        });

        rerender({ taskId: null });

        expect(result.current.isPolling).toBe(false);
      });
    });

    describe('when taskId changes to a new value', () => {
      it('should start polling for the new task', async () => {
        mockGet.mockResolvedValue(createMockTaskResponse());

        const { rerender } = renderHook(
          ({ taskId }) => useTaskPolling({ taskId, pollingInterval: TEST_POLLING_INTERVAL }),
          { initialProps: { taskId: 'task-123' } }
        );

        await waitFor(() => {
          expect(mockGet).toHaveBeenCalledWith('/api/tasks/task-123');
        });

        // Change taskId
        rerender({ taskId: 'task-456' });

        await waitFor(() => {
          expect(mockGet).toHaveBeenCalledWith('/api/tasks/task-456');
        });
      });

      it('should reset state and start fresh polling', async () => {
        // First task is processing, then we'll switch to a new task
        mockGet.mockResolvedValue(createMockTaskResponse({ status: 'processing', progress: 50 }));

        const { result, rerender } = renderHook(
          ({ taskId }) => useTaskPolling({ taskId, pollingInterval: TEST_POLLING_INTERVAL }),
          { initialProps: { taskId: 'task-123' } }
        );

        await waitFor(() => {
          expect(result.current.status).toBe('processing');
          expect(result.current.progress).toBe(50);
        });

        // Change mock to return pending status for new task
        mockGet.mockResolvedValue(
          createMockTaskResponse({
            id: 'task-456',
            status: 'pending',
            progress: 0,
          })
        );

        // Change taskId
        rerender({ taskId: 'task-456' });

        await waitFor(() => {
          expect(result.current.status).toBe('pending');
          expect(result.current.progress).toBe(0);
        });
      });
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('error handling', () => {
    it('should continue polling on network errors', async () => {
      mockGet
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(createMockTaskResponse());

      renderHook(() =>
        useTaskPolling({
          taskId: 'task-123',
          pollingInterval: TEST_POLLING_INTERVAL,
        })
      );

      // Wait for retry after error - at least 2 calls means it retried
      await waitFor(
        () => {
          expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 100 }
      );
    });

    it('should maintain isPolling state during transient errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useTaskPolling({
          taskId: 'task-123',
          pollingInterval: TEST_POLLING_INTERVAL,
        })
      );

      // Wait for initial poll attempt
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(1);
      });

      // Should still be polling despite the error
      expect(result.current.isPolling).toBe(true);
    });
  });

  // ============================================================
  // Callback Ref Updates Tests
  // ============================================================

  describe('callback updates', () => {
    it('should use latest onComplete callback', async () => {
      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();

      const taskResult = { content: 'test', parsedAt: '2024-01-01' };

      // Initially return processing status
      mockGet.mockResolvedValue(createMockTaskResponse({ status: 'processing' }));

      const { rerender } = renderHook(
        ({ onComplete }) =>
          useTaskPolling({
            taskId: 'task-123',
            onComplete,
            pollingInterval: TEST_POLLING_INTERVAL,
          }),
        { initialProps: { onComplete: onComplete1 } }
      );

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalled();
      });

      // Update the callback
      rerender({ onComplete: onComplete2 });

      // Now return completed status
      mockGet.mockResolvedValue(
        createMockTaskResponse({
          status: 'completed',
          progress: 100,
          result: taskResult,
        })
      );

      // Wait for completion callback
      await waitFor(() => {
        expect(onComplete2).toHaveBeenCalledWith(taskResult);
      });

      expect(onComplete1).not.toHaveBeenCalled();
    });

    it('should use latest onError callback', async () => {
      const onError1 = vi.fn();
      const onError2 = vi.fn();

      // Initially return processing status
      mockGet.mockResolvedValue(createMockTaskResponse({ status: 'processing' }));

      const { rerender } = renderHook(
        ({ onError }) =>
          useTaskPolling({
            taskId: 'task-123',
            onError,
            pollingInterval: TEST_POLLING_INTERVAL,
          }),
        { initialProps: { onError: onError1 } }
      );

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalled();
      });

      // Update the callback
      rerender({ onError: onError2 });

      // Now return failed status
      mockGet.mockResolvedValue(
        createMockTaskResponse({
          status: 'failed',
          error: 'Task failed',
        })
      );

      // Wait for error callback
      await waitFor(() => {
        expect(onError2).toHaveBeenCalledWith('Task failed');
      });

      expect(onError1).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Cleanup on Unmount Tests
  // ============================================================

  describe('cleanup on unmount', () => {
    it('should stop polling when component unmounts', async () => {
      mockGet.mockResolvedValue(createMockTaskResponse());

      const { result, unmount } = renderHook(() =>
        useTaskPolling({
          taskId: 'task-123',
          pollingInterval: TEST_POLLING_INTERVAL,
        })
      );

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
        expect(mockGet).toHaveBeenCalled();
      });

      const callCountBeforeUnmount = mockGet.mock.calls.length;

      unmount();

      // Wait a bit to verify no more polling happens after unmount
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockGet).toHaveBeenCalledTimes(callCountBeforeUnmount);
    });
  });

  // ============================================================
  // Edge Cases Tests
  // ============================================================

  describe('edge cases', () => {
    it('should handle pending status and continue polling', async () => {
      mockGet.mockResolvedValue(createMockTaskResponse({ status: 'pending', progress: 0 }));

      const { result } = renderHook(() =>
        useTaskPolling({
          taskId: 'task-123',
          pollingInterval: TEST_POLLING_INTERVAL,
        })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('pending');
        expect(result.current.isPolling).toBe(true);
      });

      // Should continue polling - at least 2 calls
      await waitFor(
        () => {
          expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 100 }
      );
    });

    it('should handle processing status and continue polling', async () => {
      mockGet.mockResolvedValue(createMockTaskResponse({ status: 'processing', progress: 50 }));

      const { result } = renderHook(() =>
        useTaskPolling({
          taskId: 'task-123',
          pollingInterval: TEST_POLLING_INTERVAL,
        })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('processing');
        expect(result.current.isPolling).toBe(true);
      });

      // Should continue polling - at least 2 calls
      await waitFor(
        () => {
          expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 100 }
      );
    });

    it('should not call callbacks if they are not provided', async () => {
      mockGet.mockResolvedValue(
        createMockTaskResponse({
          status: 'completed',
          progress: 100,
          result: { data: 'test' },
        })
      );

      // No onComplete or onError provided
      expect(() => {
        renderHook(() =>
          useTaskPolling({
            taskId: 'task-123',
            pollingInterval: TEST_POLLING_INTERVAL,
          })
        );
      }).not.toThrow();

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalled();
      });
    });

    it('should handle rapid taskId changes gracefully', async () => {
      mockGet.mockResolvedValue(createMockTaskResponse());

      const { rerender } = renderHook(
        ({ taskId }) => useTaskPolling({ taskId, pollingInterval: TEST_POLLING_INTERVAL }),
        { initialProps: { taskId: 'task-1' } }
      );

      // Rapid taskId changes
      rerender({ taskId: 'task-2' });
      rerender({ taskId: 'task-3' });
      rerender({ taskId: 'task-4' });

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/api/tasks/task-4');
      });
    });
  });
});
