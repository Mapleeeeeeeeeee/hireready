'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, FileText } from 'lucide-react';
import { Progress } from '@heroui/react';
import { useTranslations } from 'next-intl';

interface AnalysisLoadingProps {
  /** When true, progress jumps to 100% and completes */
  isComplete?: boolean;
}

const LOADING_STEPS = [
  { icon: Brain, key: 'step1' },
  { icon: FileText, key: 'step2' },
  { icon: Sparkles, key: 'step3' },
];

export function AnalysisLoading({ isComplete = false }: AnalysisLoadingProps) {
  const t = useTranslations('history.analyzing');
  const [progress, setProgress] = useState(0);
  const displayProgress = isComplete ? 100 : progress;

  // Animate progress from 0 to 99, then cap at 99 until isComplete
  useEffect(() => {
    if (isComplete) return;

    // Fast initial progress, then slow down asymptotically to 99
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) return 99;
        // Slow down as we approach 99
        const increment = Math.max(0.5, (99 - prev) * 0.08);
        return Math.min(99, prev + increment);
      });
    }, 200);

    return () => clearInterval(timer);
  }, [isComplete]);

  // Determine current step based on progress
  let currentStepIndex = 0;
  if (displayProgress < 30) currentStepIndex = 0;
  else if (displayProgress < 70) currentStepIndex = 1;
  else currentStepIndex = 2;

  const CurrentIcon = LOADING_STEPS[currentStepIndex].icon;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="border-terracotta/10 relative overflow-hidden rounded-2xl border bg-white/80 p-8 shadow-lg backdrop-blur-sm">
        {/* Background Decorative Elements */}
        <div className="bg-terracotta/5 absolute -top-16 -left-16 h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-soft-clay/30 absolute -right-16 -bottom-16 h-48 w-48 rounded-full blur-3xl" />

        <div className="relative flex flex-col items-center justify-center space-y-8 text-center">
          {/* Main Icon Animation */}
          <div className="relative">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="from-terracotta to-terracotta/80 shadow-terracotta/20 relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-xl"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStepIndex}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3 }}
                >
                  <CurrentIcon className="h-10 w-10" />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Ripples */}
            <motion.div
              animate={{
                scale: [1, 1.5],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="bg-terracotta/20 absolute inset-0 rounded-2xl"
            />
          </div>

          {/* Text Content */}
          <div className="max-w-sm space-y-2">
            <h3 className="text-charcoal font-serif text-xl font-medium">{t('title')}</h3>
            <p className="text-charcoal/60 text-sm leading-relaxed">{t('description')}</p>
          </div>

          {/* Progress Section */}
          <div className="w-full max-w-md space-y-3">
            <div className="text-charcoal/50 flex justify-between text-xs font-medium tracking-wider uppercase">
              <span>{t('status')}</span>
              <span>{Math.round(displayProgress)}%</span>
            </div>

            <Progress
              aria-label="Analysis progress"
              value={displayProgress}
              classNames={{
                base: 'max-w-md',
                track: 'bg-warm-gray/20 h-2',
                indicator: 'bg-terracotta bg-gradient-to-r from-terracotta to-terracotta/80',
              }}
            />

            {/* Steps Indicators */}
            <div className="flex justify-between pt-2">
              {LOADING_STEPS.map((step, idx) => {
                const isActive = idx === currentStepIndex;
                const isCompleted = idx < currentStepIndex;

                return (
                  <motion.div
                    key={step.key}
                    animate={{ opacity: isActive || isCompleted ? 1 : 0.3 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${isActive || isCompleted ? 'bg-terracotta' : 'bg-charcoal/20'}`}
                    />
                    <span className="text-charcoal/60 text-[10px] font-medium">
                      {t(`steps.${step.key}`)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
