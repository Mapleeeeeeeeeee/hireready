/**
 * React hook for managing interview session timer
 * Extracted from use-live-api.ts for better separation of concerns
 */

'use client';

import { useCallback, useRef } from 'react';
import { useInterviewStore } from '@/lib/stores/interview-store';

export interface UseInterviewTimerReturn {
  /** Start the timer (increments every second) */
  startTimer: () => void;
  /** Stop the timer */
  stopTimer: () => void;
  /** Current elapsed seconds (from store) */
  elapsedSeconds: number;
}

/**
 * Hook for managing interview session timer
 * Uses the interview store to persist elapsed time
 */
export function useInterviewTimer(): UseInterviewTimerReturn {
  const store = useInterviewStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Start the session timer
   * Increments elapsedSeconds in store every second
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

  return {
    startTimer,
    stopTimer,
    elapsedSeconds: store.elapsedSeconds,
  };
}
