'use client';

/**
 * Task polling hook for monitoring background task status
 * Polls the task API endpoint until the task is completed or failed
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/utils/api-client';
import { logger } from '@/lib/utils/logger';
import type { TaskStatus } from '@/lib/queue/types';

// ============================================================
// Types
// ============================================================

interface TaskResponse {
  id: string;
  type: string;
  status: TaskStatus;
  progress: number;
  resourceId: string | null;
  error: string | null;
  result: unknown;
}

export interface UseTaskPollingOptions {
  /** Task ID to poll. Polling starts when this is set to a non-null value */
  taskId: string | null;
  /** Callback when task completes successfully */
  onComplete?: (result: unknown) => void;
  /** Callback when task fails */
  onError?: (error: string) => void;
  /** Polling interval in milliseconds (default: 2000ms) */
  pollingInterval?: number;
}

export interface UseTaskPollingReturn {
  /** Current task status */
  status: TaskStatus | null;
  /** Current task progress (0-100) */
  progress: number;
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Stop polling manually */
  stopPolling: () => void;
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_POLLING_INTERVAL = 2000;

// ============================================================
// Hook Implementation
// ============================================================

/**
 * Custom hook for polling background task status.
 * Automatically starts polling when taskId is provided and stops
 * when task reaches a terminal state (completed/failed).
 *
 * @param options - Configuration options for polling
 * @returns Task status and control functions
 *
 * @example
 * const { status, progress, isPolling } = useTaskPolling({
 *   taskId: resumeTaskId,
 *   onComplete: (result) => {
 *     console.log('Task completed:', result);
 *   },
 *   onError: (error) => {
 *     console.error('Task failed:', error);
 *   },
 * });
 */
export function useTaskPolling(options: UseTaskPollingOptions): UseTaskPollingReturn {
  const { taskId, onComplete, onError, pollingInterval = DEFAULT_POLLING_INTERVAL } = options;

  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  // Refs for callbacks to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  // Ref to track if polling should continue
  const shouldPollRef = useRef(false);

  // Stop polling function
  const stopPolling = useCallback(() => {
    shouldPollRef.current = false;
    setIsPolling(false);
  }, []);

  // Polling effect
  useEffect(() => {
    // Don't start polling if no taskId
    if (!taskId) {
      // Reset state when taskId becomes null
      // This is intentional as we need to sync state when input prop changes
      setStatus(null); // eslint-disable-line react-hooks/set-state-in-effect
      setProgress(0);
      setIsPolling(false);
      return;
    }

    // Prevent duplicate polling in StrictMode
    // When StrictMode double-invokes effects, the first cleanup sets shouldPollRef to false,
    // but if we're already polling (shouldPollRef is true), skip starting another one
    if (shouldPollRef.current) {
      return;
    }

    // Set up polling
    shouldPollRef.current = true;
    setIsPolling(true);

    const poll = async () => {
      if (!shouldPollRef.current) return;

      try {
        const response = await apiClient.get<TaskResponse>(`/api/tasks/${taskId}`);

        if (!shouldPollRef.current) return;

        setStatus(response.status);
        setProgress(response.progress);

        logger.debug('Task poll result', {
          module: 'use-task-polling',
          action: 'poll',
          taskId,
          status: response.status,
          progress: response.progress,
        });

        // Check terminal states
        if (response.status === 'completed') {
          shouldPollRef.current = false;
          setIsPolling(false);
          onCompleteRef.current?.(response.result);
          return;
        }

        if (response.status === 'failed') {
          shouldPollRef.current = false;
          setIsPolling(false);
          onErrorRef.current?.(response.error || 'Task failed');
          return;
        }

        // Schedule next poll
        if (shouldPollRef.current) {
          setTimeout(poll, pollingInterval);
        }
      } catch (error) {
        logger.error('Task polling error', error as Error, {
          module: 'use-task-polling',
          action: 'poll',
          taskId,
        });

        // Continue polling on transient errors (network issues)
        if (shouldPollRef.current) {
          setTimeout(poll, pollingInterval);
        }
      }
    };

    // Start polling immediately
    poll();

    // Cleanup
    return () => {
      shouldPollRef.current = false;
      setIsPolling(false);
    };
  }, [taskId, pollingInterval]);

  return {
    status,
    progress,
    isPolling,
    stopPolling,
  };
}
