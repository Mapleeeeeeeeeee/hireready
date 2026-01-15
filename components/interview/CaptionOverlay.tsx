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
          className="absolute bottom-16 left-1/2 z-10 max-w-[90%] -translate-x-1/2"
        >
          <div className="rounded-lg bg-black/70 px-4 py-3 backdrop-blur-sm">
            <p className="text-center text-lg leading-relaxed font-medium break-words text-white">
              {interimAiText.trim()}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
