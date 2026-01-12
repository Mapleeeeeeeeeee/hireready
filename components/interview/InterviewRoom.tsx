'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AudioVisualizer } from './AudioVisualizer';
import { ControlBar } from './ControlBar';
import { Activity } from 'lucide-react';

type SessionState = 'idle' | 'listening' | 'speaking' | 'processing';

export function InterviewRoom() {
  const router = useRouter();
  const t = useTranslations('interview.room');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [sessionState] = useState<SessionState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer for session duration
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    router.push('/');
  };

  const getStateLabel = (state: SessionState): string => {
    return t(`states.${state}`);
  };

  return (
    <div className="bg-warm-paper text-charcoal relative flex h-screen w-full flex-col items-center justify-between overflow-hidden p-6">
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform">
          <div className="bg-soft-clay/40 animate-pulse-soft h-[600px] w-[600px] rounded-full blur-[100px]" />
        </div>
      </div>

      {/* Header / Top Bar */}
      <header className="text-charcoal/60 z-10 flex w-full items-center justify-between text-sm font-medium tracking-wide">
        <div className="flex items-center gap-2">
          <div className="bg-terracotta h-2 w-2 animate-pulse rounded-full" />
          {t('liveSession')} • {formatTime(elapsedSeconds)}
        </div>
        <div className="border-warm-gray/20 flex items-center gap-2 rounded-full border bg-white/50 px-3 py-1 backdrop-blur-sm">
          <Activity className="text-terracotta h-4 w-4" />
          <span className="text-charcoal/80">{t('connected')}</span>
        </div>
      </header>

      {/* Main Visualizer Area */}
      <main className="z-10 flex flex-1 flex-col items-center justify-center">
        <AudioVisualizer
          state={sessionState}
          audioLevel={0.5}
          stateLabel={getStateLabel(sessionState)}
        />
      </main>

      {/* Controls */}
      <div className="z-10 mb-8">
        <ControlBar
          isMicOn={isMicOn}
          isVideoOn={isVideoOn}
          onToggleMic={() => setIsMicOn(!isMicOn)}
          onToggleVideo={() => setIsVideoOn(!isVideoOn)}
          onEndCall={handleEndCall}
          labels={{
            muteMic: t('muteMic'),
            unmuteMic: t('unmuteMic'),
            turnOffCamera: t('turnOffCamera'),
            turnOnCamera: t('turnOnCamera'),
            endCall: t('endCall'),
          }}
        />
      </div>
    </div>
  );
}
