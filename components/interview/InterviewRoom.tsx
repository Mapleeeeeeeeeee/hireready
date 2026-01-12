'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { AudioVisualizer } from './AudioVisualizer';
import { ControlBar } from './ControlBar';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';
import { useLiveApi } from '@/lib/hooks/use-live-api';
import type { SessionState } from '@/lib/gemini/types';
import type { SupportedLanguage } from '@/lib/gemini/prompts';

export function InterviewRoom() {
  const router = useRouter();
  const t = useTranslations('interview.room');
  const locale = useLocale() as SupportedLanguage;

  // Ref to prevent double connection in StrictMode
  const hasConnectedRef = useRef(false);

  // Use the Live API hook
  const {
    sessionState,
    isConnected,
    isMicOn,
    visualizerVolume,
    elapsedSeconds,
    lastError,
    isSupported,
    connect,
    disconnect,
    toggleMic,
  } = useLiveApi({ language: locale });

  // Auto-connect on mount (with guard to prevent double connection)
  useEffect(() => {
    if (isSupported && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (hasConnectedRef.current) {
        disconnect();
        hasConnectedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported]); // Intentionally exclude connect/disconnect to avoid infinite loops

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle end call
  const handleEndCall = useCallback(() => {
    disconnect();
    router.push('/');
  }, [disconnect, router]);

  // Get state label for display
  const getStateLabel = useCallback(
    (state: SessionState): string => {
      return t(`states.${state}`);
    },
    [t]
  );

  // Get connection status display
  const getConnectionStatus = useCallback(() => {
    if (sessionState === 'connecting') {
      return (
        <>
          <Loader2 className="text-terracotta h-4 w-4 animate-spin" />
          <span className="text-charcoal/80">{t('connecting')}</span>
        </>
      );
    }
    if (sessionState === 'error') {
      return (
        <>
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-500">{t('error')}</span>
        </>
      );
    }
    if (isConnected) {
      return (
        <>
          <Activity className="text-terracotta h-4 w-4" />
          <span className="text-charcoal/80">{t('connected')}</span>
        </>
      );
    }
    return (
      <>
        <div className="h-4 w-4 rounded-full bg-gray-300" />
        <span className="text-charcoal/60">{t('disconnected')}</span>
      </>
    );
  }, [sessionState, isConnected, t]);

  // Show error message if not supported
  if (!isSupported) {
    return (
      <div className="bg-warm-paper text-charcoal flex h-screen w-full flex-col items-center justify-center p-6">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h2 className="mb-2 text-xl font-semibold">{t('notSupported')}</h2>
        <p className="text-charcoal/60 text-center">{t('notSupportedMessage')}</p>
      </div>
    );
  }

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
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-terracotta animate-pulse' : 'bg-gray-400'
            }`}
          />
          {t('liveSession')} • {formatTime(elapsedSeconds)}
        </div>
        <div className="border-warm-gray/20 flex items-center gap-2 rounded-full border bg-white/50 px-3 py-1 backdrop-blur-sm">
          {getConnectionStatus()}
        </div>
      </header>

      {/* Error Message */}
      {lastError && (
        <div className="z-10 mt-4 max-w-md rounded-lg bg-red-50 px-4 py-3 text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{lastError.message}</span>
          </div>
        </div>
      )}

      {/* Main Visualizer Area */}
      <main className="z-10 flex flex-1 flex-col items-center justify-center">
        <AudioVisualizer
          state={sessionState}
          audioLevel={visualizerVolume}
          stateLabel={getStateLabel(sessionState)}
        />
      </main>

      {/* Controls */}
      <div className="z-10 mb-8">
        <ControlBar
          isMicOn={isMicOn}
          isVideoOn={false}
          onToggleMic={toggleMic}
          onToggleVideo={() => {}} // Video not implemented yet
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
