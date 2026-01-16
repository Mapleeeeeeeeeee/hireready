'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { SessionState } from '@/lib/gemini/types';

interface CaptionOverlayProps {
  isOn: boolean;
  interimAiText: string;
  sessionState: SessionState;
}

/**
 * Caption overlay component that displays AI subtitles
 * Positioned at the bottom of the video container (CC style)
 * Only shows text when AI is speaking and captions are enabled
 */
export function CaptionOverlay({ isOn, interimAiText, sessionState }: CaptionOverlayProps) {
  // Only show AI text when captions are on and AI is speaking
  const showCaption = isOn && sessionState === 'speaking' && interimAiText.trim();

  return (
    <AnimatePresence mode="wait">
      {showCaption && (
        <motion.div
          key="ai-caption"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-20 left-1/2 z-10 w-[95%] max-w-md -translate-x-1/2 sm:bottom-16 sm:w-[90%]"
        >
          <div className="rounded-xl bg-black/80 px-3 py-2.5 shadow-lg backdrop-blur-md sm:rounded-lg sm:px-4 sm:py-3">
            <p className="text-center text-sm leading-relaxed font-medium break-words text-white sm:text-base md:text-lg">
              {interimAiText.trim()}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
