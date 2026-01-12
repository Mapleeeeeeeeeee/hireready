'use client';

import { motion } from 'framer-motion';

type AudioState = 'idle' | 'listening' | 'speaking' | 'processing';

interface AudioVisualizerProps {
  state: AudioState;
  audioLevel?: number; // 0 to 1
  stateLabel?: string;
}

export function AudioVisualizer({ state, audioLevel = 0, stateLabel }: AudioVisualizerProps) {
  const getColors = () => {
    switch (state) {
      case 'listening':
        return ['bg-terracotta/10', 'bg-terracotta/5'];
      case 'speaking':
        return ['bg-terracotta/30', 'bg-terracotta/20'];
      case 'processing':
        return ['bg-warm-gray/20', 'bg-soft-clay/30'];
      default: // idle
        return ['bg-warm-gray/10', 'bg-warm-gray/5'];
    }
  };

  const [coreColor, glowColor] = getColors();

  return (
    <div className="relative flex h-64 w-64 items-center justify-center">
      {/* Outer Glow Ring - softer blur for "paper" feel */}
      <motion.div
        animate={{
          scale: state === 'speaking' ? [1, 1.1 + audioLevel, 1] : [1, 1.02, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: state === 'speaking' ? 0.4 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`absolute inset-0 rounded-full blur-2xl ${glowColor}`}
      />

      {/* Inner Core */}
      <motion.div
        animate={{
          scale: state === 'speaking' ? [1, 1.05 + audioLevel * 0.3, 1] : [1, 1.01, 1],
        }}
        transition={{
          duration: state === 'speaking' ? 0.2 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`relative flex h-32 w-32 items-center justify-center rounded-full backdrop-blur-sm ${coreColor} border-warm-gray/20 border shadow-sm`}
      >
        {/* Subtle organic movement inside */}
        <div className="relative h-full w-full overflow-hidden rounded-full opacity-30">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-4 bg-[conic-gradient(from_0deg,transparent_0deg,#d97757_360deg)] opacity-20 blur-xl"
          />
        </div>
      </motion.div>

      {/* Status Label */}
      <div className="absolute -bottom-16 text-center">
        <motion.span
          key={state}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-charcoal/50 font-serif text-xs tracking-wider italic"
        >
          {stateLabel}
        </motion.span>
      </div>
    </div>
  );
}
