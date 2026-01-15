'use client';

import { useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Progress } from '@heroui/react';
import { Play, Pause } from 'lucide-react';
import { formatTimeDisplay } from '@/lib/utils/format';

// ============================================================
// Types
// ============================================================

export interface AudioPlayerProps {
  /** URL of the audio file to play */
  src: string;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================
// Component
// ============================================================

export function AudioPlayer({ src, className = '' }: AudioPlayerProps) {
  const t = useTranslations('history.audio');
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // ============================================================
  // Audio Event Handlers
  // ============================================================

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError(true);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    // Attach event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      // Cleanup event listeners
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // ============================================================
  // Player Controls
  // ============================================================

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Failed to play audio:', err);
        setError(true);
      }
    }
  };

  const handleProgressChange = (value: number | number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Array.isArray(value) ? value[0] : value;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // ============================================================
  // Render
  // ============================================================

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`bg-soft-clay/30 border-warm-gray/10 flex flex-col gap-3 rounded-xl border p-4 ${className}`}
      role="region"
      aria-label={t('play')}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Error State */}
      {error && (
        <div className="text-center">
          <p className="text-charcoal/60 text-sm">{t('error')}</p>
        </div>
      )}

      {/* Player UI */}
      {!error && (
        <>
          {/* Controls and Time Display */}
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <Button
              isIconOnly
              variant="flat"
              color="primary"
              size="sm"
              onPress={togglePlayPause}
              isDisabled={isLoading || error}
              aria-label={isPlaying ? t('pause') : t('play')}
              className="bg-terracotta/10 text-terracotta hover:bg-terracotta/20 flex-shrink-0"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            {/* Time Display */}
            <div className="text-charcoal/70 flex flex-1 items-center justify-between font-mono text-xs">
              <span aria-live="off">{formatTimeDisplay(currentTime)}</span>
              <span className="text-charcoal/40">/</span>
              <span>{isLoading ? t('loading') : formatTimeDisplay(duration)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <Progress
            aria-label={`${t('play')} ${Math.round(progress)}%`}
            value={progress}
            size="sm"
            color="primary"
            className="w-full cursor-pointer"
            classNames={{
              indicator: 'bg-terracotta',
              track: 'bg-warm-gray/20',
            }}
            onChange={(e) => {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              const clickX = (e as unknown as MouseEvent).clientX - rect.left;
              const newTime = (clickX / rect.width) * duration;
              handleProgressChange(newTime);
            }}
          />
        </>
      )}
    </div>
  );
}
