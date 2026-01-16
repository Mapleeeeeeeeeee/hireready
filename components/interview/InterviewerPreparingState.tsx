'use client';

/**
 * InterviewerPreparingState Component
 * Displays a loading state while the interviewer is preparing (e.g., parsing resume)
 */

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Progress, Avatar, Button } from '@heroui/react';
import { Bot, FileText } from 'lucide-react';

// ============================================================
// Constants
// ============================================================

/** Duration for the fake progress animation in milliseconds */
const ANIMATION_DURATION = 30000; // 30 seconds
/** Maximum value for fake progress (stops at 99% to wait for actual completion) */
const MAX_FAKE_PROGRESS = 99;
/** Interval for updating fake progress in milliseconds */
const UPDATE_INTERVAL = 100;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Easing function: easeOutQuad
 * Creates a natural deceleration effect (fast at start, slow at end)
 * @param t - Progress value from 0 to 1
 * @returns Eased progress value from 0 to 1
 */
const easeOutQuad = (t: number): number => t * (2 - t);

// ============================================================
// Types
// ============================================================

interface InterviewerPreparingStateProps {
  /** Progress value (0-100) */
  progress?: number;
  /** Optional class name for additional styling */
  className?: string;
  /** Whether the preparation is complete and ready to start */
  isReady?: boolean;
  /** Callback when the start button is clicked */
  onStart?: () => void;
}

// ============================================================
// Component
// ============================================================

/**
 * InterviewerPreparingState displays a friendly loading state
 * while waiting for background tasks like resume parsing to complete.
 *
 * Features:
 * - Animated interviewer avatar
 * - Fake progress animation with easing (0-99% over 30 seconds)
 * - Progress bar showing max of fake and real progress
 * - Jumps to 100% only when isReady is true
 * - i18n supported messages with dynamic text based on ready state
 */
export function InterviewerPreparingState({
  progress = 0,
  className = '',
  isReady = false,
  onStart,
}: InterviewerPreparingStateProps) {
  const t = useTranslations('interview');

  // Track fake progress for smooth animation
  const [fakeProgress, setFakeProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // Fake progress animation effect
  useEffect(() => {
    // Set start time when effect runs (not during render)
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      if (startTimeRef.current === null) return;

      const elapsed = Date.now() - startTimeRef.current;
      const normalizedTime = Math.min(elapsed / ANIMATION_DURATION, 1);
      const easedProgress = easeOutQuad(normalizedTime) * MAX_FAKE_PROGRESS;
      setFakeProgress(Math.floor(easedProgress));

      // Stop interval when max progress is reached
      if (normalizedTime >= 1) {
        clearInterval(interval);
      }
    }, UPDATE_INTERVAL);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  // Calculate display progress:
  // - When ready: show 100%
  // - Otherwise: show max of fake progress and real progress
  const displayProgress = isReady ? 100 : Math.max(fakeProgress, progress);

  return (
    <div
      className={`bg-warm-paper flex min-h-screen w-full flex-col items-center justify-center p-6 ${className}`}
    >
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform">
          <div className="bg-soft-clay/30 animate-pulse-soft h-[500px] w-[500px] rounded-full blur-[100px]" />
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 flex max-w-md flex-col items-center text-center"
      >
        {/* Interviewer Avatar */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative mb-8"
        >
          <Avatar
            icon={<Bot className="h-10 w-10" />}
            classNames={{
              base: 'w-24 h-24 bg-terracotta/20',
              icon: 'text-terracotta',
            }}
          />
          {/* Reading document indicator */}
          <motion.div
            className="absolute -right-2 -bottom-2 rounded-full bg-white p-2 shadow-lg"
            animate={{
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <FileText className="text-terracotta h-5 w-5" />
          </motion.div>
        </motion.div>

        {/* Title - switches based on ready state */}
        <h2 className="text-charcoal mb-3 text-xl font-semibold">
          {isReady ? t('interviewerReady') : t('interviewerPreparing')}
        </h2>

        {/* Description - switches based on ready state */}
        <p className="text-charcoal/60 mb-8 text-sm">
          {isReady ? t('readyDescription') : t('preparingDescription')}
        </p>

        {/* Progress Bar */}
        <div className="w-full max-w-xs">
          <Progress
            aria-label="Parsing progress"
            value={displayProgress}
            classNames={{
              base: 'max-w-xs',
              track: 'bg-warm-gray/20',
              indicator: 'bg-terracotta',
            }}
            size="sm"
          />
          <p className="text-charcoal/40 mt-2 text-xs">{displayProgress}%</p>
        </div>

        {/* Start Button (shown when ready) */}
        {isReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            <Button
              color="primary"
              size="lg"
              onPress={onStart}
              className="bg-terracotta hover:bg-terracotta/90 px-8 font-medium text-white"
            >
              {t('startButton')}
            </Button>
          </motion.div>
        )}

        {/* Animated Dots (hidden when ready) */}
        {!isReady && (
          <div className="mt-8 flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="bg-terracotta/60 h-2 w-2 rounded-full"
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
