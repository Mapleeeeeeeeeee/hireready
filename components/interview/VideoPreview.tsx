'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoOff, User, AlertCircle } from 'lucide-react';
import type { SessionState } from '@/lib/gemini/types';

interface VideoPreviewProps {
  /** The media stream to display */
  stream: MediaStream | null;
  /** Whether the video is currently on */
  isVideoOn: boolean;
  /** Current session state for audio visualization */
  sessionState?: SessionState;
  /** Audio level for visualization (0-1) */
  audioLevel?: number;
  /** Camera error if any */
  error?: Error | null;
  /** Optional class name for additional styling */
  className?: string;
}

/**
 * Audio level indicator bars - Google Meet style
 * Shows real-time microphone audio level regardless of session state
 */
function AudioIndicator({ audioLevel }: { audioLevel: number }) {
  const bars = [0.4, 0.7, 1.0, 0.7, 0.4]; // Heights distribution

  // Show animation when there's any audio level (threshold: 0.01)
  const hasAudio = audioLevel > 0.01;

  return (
    <div className="flex h-4 items-end gap-0.5">
      {bars.map((baseHeight, i) => {
        const height = hasAudio ? Math.max(4, baseHeight * (8 + audioLevel * 12)) : 4;
        return (
          <motion.div
            key={i}
            animate={{ height }}
            transition={{ duration: 0.1 }}
            className={`w-1 rounded-full ${hasAudio ? 'bg-green-400' : 'bg-gray-500'}`}
          />
        );
      })}
    </div>
  );
}

/**
 * Video preview component that displays the user's camera feed.
 * The video is mirrored for a natural self-viewing experience.
 * Designed to be the main view like Google Meet.
 */
export function VideoPreview({
  stream,
  isVideoOn,
  // sessionState is available for future audio visualization enhancements
  sessionState: _sessionState = 'idle',
  audioLevel = 0,
  error,
  className = '',
}: VideoPreviewProps) {
  const t = useTranslations('interview.room.video');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Update stream ref when it changes
  useEffect(() => {
    streamRef.current = stream;
    // If video element exists and stream changed, update it
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play()?.catch(() => {
        // Ignore play errors - typically happens during unmount or permission issues
      });
    }
  }, [stream]);

  // Callback ref for video element - called on mount
  const handleVideoRef = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (video && streamRef.current && video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
      video.play()?.catch(() => {
        // Ignore play errors
      });
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`relative aspect-video max-h-[60vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-gray-900 shadow-2xl ${className}`}
    >
      <AnimatePresence mode="wait">
        {isVideoOn && stream ? (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full"
          >
            <video
              ref={handleVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900"
          >
            <div className="mb-4 rounded-full bg-gray-700/50 p-8">
              {error ? (
                <AlertCircle className="h-20 w-20 text-red-400" />
              ) : isVideoOn ? (
                <User className="h-20 w-20 text-gray-400" />
              ) : (
                <VideoOff className="h-20 w-20 text-gray-400" />
              )}
            </div>
            <span className="text-lg font-medium text-gray-400">
              {error ? error.message : isVideoOn ? t('loadingCamera') : t('cameraOff')}
            </span>
            <span className="mt-2 text-sm text-gray-500">
              {error ? '' : isVideoOn ? '' : t('cameraOffHint')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIVE Indicator - Top Left */}
      {isVideoOn && stream && (
        <div className="absolute top-4 left-4">
          <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-medium text-white">{t('live')}</span>
          </div>
        </div>
      )}

      {/* You label with Audio Indicator - Bottom Left (like Google Meet) */}
      <div className="absolute bottom-4 left-4">
        <div className="flex items-center gap-2 rounded-md bg-black/60 px-3 py-1.5 backdrop-blur-sm">
          <span className="text-sm font-medium text-white">{t('you')}</span>
          <AudioIndicator audioLevel={audioLevel} />
        </div>
      </div>
    </motion.div>
  );
}
