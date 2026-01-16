'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ControlBar } from './ControlBar';
import { VideoPreview } from './VideoPreview';
import { SaveConfirmDialog } from './SaveConfirmDialog';
import { InterviewerPreparingState } from './InterviewerPreparingState';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';
import { useLiveApi } from '@/lib/hooks/use-live-api';
import { useVideoPreview } from '@/lib/hooks/use-video-preview';
import { useAudioLevel } from '@/lib/hooks/use-audio-level';
import { useTaskPolling } from '@/lib/hooks/use-task-polling';
import { useInterviewStore } from '@/lib/stores/interview-store';
import { apiClient } from '@/lib/utils/api-client';
import { toAppError, UnauthorizedError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import { formatTimeDisplay } from '@/lib/utils/format';
import { showErrorToast } from '@/lib/utils/toast';
import type { SupportedLanguage } from '@/lib/gemini/prompts';
import type { ResumeContent } from '@/lib/resume/types';

// ============================================================
// Types
// ============================================================

interface SaveInterviewResponse {
  id: string;
  createdAt: string;
  taskId: string | null;
}

export function InterviewRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('interview.room');
  const tErrors = useTranslations('errors');
  const locale = useLocale() as SupportedLanguage;

  // Helper to get localized error message
  const getLocalizedError = useCallback(
    (error: { code?: string; message?: string }) => {
      if (error.code) {
        // Try to get translated message, fall back to raw message or generic error
        const translated = tErrors(error.code as Parameters<typeof tErrors>[0]);
        // If translation returns the key itself, it means no translation found
        if (translated !== error.code) {
          return translated;
        }
      }
      return error.message || tErrors('UNKNOWN_ERROR');
    },
    [tErrors]
  );

  // Get resumeTaskId from URL search params
  const resumeTaskId = searchParams.get('resumeTaskId');

  // Ref to prevent double connection in StrictMode
  const hasConnectedRef = useRef(false);

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [isSaveUnauthorized, setIsSaveUnauthorized] = useState(false);

  // Preparing state - whether we're waiting for resume parsing
  const [isPreparing, setIsPreparing] = useState(!!resumeTaskId);

  // Ready to start state - task completed but waiting for user to click start
  const [isReadyToStart, setIsReadyToStart] = useState(false);

  // Interview data from store
  const transcripts = useInterviewStore((state) => state.transcripts);
  const jobDescription = useInterviewStore((state) => state.jobDescription);
  const setResumeContent = useInterviewStore((state) => state.setResumeContent);
  const storeLanguage = useInterviewStore((state) => state.language); // User selected language from setup

  // Use the Live API hook
  const {
    sessionState,
    isConnected,
    isMicOn,
    // visualizerVolume, // Unused
    elapsedSeconds,
    lastError,
    isSupported,
    connect,
    disconnect,
    toggleMic,
  } = useLiveApi({ language: storeLanguage || locale });

  // Use the Video Preview hook for self-viewing
  const { isVideoOn, stream: videoStream, toggleVideo, error: videoError } = useVideoPreview();

  // Caption state from store
  const isCaptionOn = useInterviewStore((state) => state.isCaptionOn);
  const toggleCaption = useInterviewStore((state) => state.toggleCaption);
  const interimAiTranscript = useInterviewStore((state) => state.interimAiTranscript);

  // Interview data from store

  // Task polling for resume parsing
  const { progress: taskProgress } = useTaskPolling({
    taskId: isPreparing ? resumeTaskId : null,
    onComplete: useCallback(
      (result: unknown) => {
        logger.info('Resume parsing completed', {
          module: 'interview-room',
          action: 'task-complete',
          taskId: resumeTaskId,
        });

        // Sync parsed resume content to store
        if (result && typeof result === 'object' && 'content' in result) {
          try {
            const taskResult = result as { content: string; parsedAt: string };
            const parsedContent: ResumeContent = JSON.parse(taskResult.content);
            setResumeContent(parsedContent);
            logger.info('Resume content synced to store', {
              module: 'interview-room',
              action: 'sync-resume',
              resumeName: parsedContent.name,
            });
          } catch (error) {
            logger.error('Failed to parse resume content from task result', error as Error, {
              module: 'interview-room',
              action: 'sync-resume-error',
            });
          }
        }

        // Set ready to start instead of starting immediately
        setIsReadyToStart(true);
      },
      [resumeTaskId, setResumeContent]
    ),
    onError: useCallback(
      (error: string) => {
        logger.warn('Resume parsing failed, proceeding anyway', {
          module: 'interview-room',
          action: 'task-error',
          taskId: resumeTaskId,
          error,
        });
        // Even if parsing fails, we can still proceed with the interview
        setIsReadyToStart(true);
      },
      [resumeTaskId]
    ),
  });

  // Handle start interview when user clicks the start button
  const handleStartInterview = useCallback(() => {
    setIsPreparing(false);
    setIsReadyToStart(false);
  }, []);

  // Use the Audio Level hook for real-time microphone visualization
  const {
    audioLevel: micAudioLevel,
    start: startMicMonitoring,
    stop: stopMicMonitoring,
  } = useAudioLevel();
  // Sync microphone monitoring with isMicOn state
  // Start/stop based on mic toggle button
  useEffect(() => {
    if (isMicOn) {
      startMicMonitoring();
    } else {
      stopMicMonitoring();
    }
  }, [isMicOn, startMicMonitoring, stopMicMonitoring]);

  // Auto-connect to Gemini API on mount (with guard to prevent double connection)
  // Only connect when not preparing (resume parsing is complete)
  useEffect(() => {
    if (isSupported && !hasConnectedRef.current && !isPreparing) {
      hasConnectedRef.current = true;
      connect();
    }

    // Cleanup on unmount - reset ref to allow reconnection on remount
    // This is necessary for React StrictMode which unmounts and remounts
    return () => {
      hasConnectedRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, isPreparing]); // Intentionally exclude connect/disconnect to avoid infinite loops

  // Determine which audio level to show
  // Fix: Always use local mic level for self-view, never the AI output volume
  const getDisplayAudioLevel = (): number => {
    if (!isMicOn) return 0; // Muted
    return micAudioLevel; // Always use local mic monitoring for self-view
  };
  const displayAudioLevel = getDisplayAudioLevel();

  // Handle end call
  const handleEndCall = useCallback(() => {
    disconnect();
    setSaveError(''); // Clear any previous errors
    setShowSaveDialog(true);
  }, [disconnect]);

  // Handle save interview
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(''); // Clear previous errors

    logger.info('Preparing to save interview', {
      module: 'interview-room',
      action: 'save-prepare',
      transcriptCount: transcripts.length,
      duration: elapsedSeconds,
      hasJobDescription: !!jobDescription,
    });

    try {
      const response = await apiClient.post<SaveInterviewResponse>('/api/interview/save', {
        transcripts,
        duration: elapsedSeconds,
        language: locale as 'en' | 'zh-TW',
        jobDescriptionUrl: jobDescription?.url,
        jobDescription: jobDescription,
      });

      logger.info('Interview saved', {
        module: 'interview-room',
        action: 'save',
        interviewId: response.id,
        taskId: response.taskId,
        transcriptCount: transcripts.length,
      });

      // Navigate to history detail page, with taskId if analysis is queued
      const historyUrl = response.taskId
        ? `/history/${response.id}?analysisTaskId=${response.taskId}`
        : `/history/${response.id}`;
      router.push(historyUrl);
      router.push(historyUrl);
    } catch (error) {
      logger.error('Failed to save interview', error as Error, {
        module: 'interview-room',
        action: 'save',
      });

      const appError = toAppError(error);

      // Handle Unauthorized Error specifically
      if (appError instanceof UnauthorizedError) {
        setIsSaveUnauthorized(true);
        setSaveError(''); // Clear generic error

        // Persist interview state to session storage
        try {
          const pendingState = {
            transcripts,
            elapsedSeconds,
            jobDescription,
            resumeContent: useInterviewStore.getState().resumeContent,
            timestamp: Date.now(),
          };
          sessionStorage.setItem('pending_interview_save', JSON.stringify(pendingState));
          logger.info('Persisted interview state for login', {
            module: 'interview-room',
            action: 'persist-state',
          });
        } catch (e) {
          logger.error('Failed to persist interview state', e as Error, {
            module: 'interview-room',
            action: 'persist-state-error',
          });
        }
      } else {
        const localizedMessage = getLocalizedError(appError);

        // Show error in dialog (keep dialog open)
        setSaveError(localizedMessage);

        // Also show toast notification
        showErrorToast({
          title: t('saveDialog.errorTitle'),
          description: localizedMessage,
        });
      }

      setIsSaving(false);
    }
  }, [
    transcripts,
    elapsedSeconds,
    locale,
    jobDescription,
    router,
    t,
    getLocalizedError,
    // Add missing deps
  ]);

  // Restore state from session storage if exists
  useEffect(() => {
    try {
      const storedState = sessionStorage.getItem('pending_interview_save');
      if (storedState) {
        const parsed = JSON.parse(storedState);

        // Only restore if less than 1 hour old
        if (Date.now() - parsed.timestamp < 3600000) {
          logger.info('Restoring interview state', {
            module: 'interview-room',
            action: 'restore-state',
          });

          // We need access to store setters that might not be exposed in the interface
          // Check if we can just set them or need to extend the interface
          // For now, let's try to restore what we can via available actions or manual store manipulation
          // NOTE: In a real app we should expose setTranscripts etc. in the store.
          // Assuming we might need to add these actions to the store or use a hack.
          // Let's assume we can use the store actions if available, or we might need to use `useInterviewStore.setState`
          useInterviewStore.setState({
            transcripts: parsed.transcripts,
            elapsedSeconds: parsed.elapsedSeconds,
            jobDescription: parsed.jobDescription,
            resumeContent: parsed.resumeContent,
          });

          // Show save dialog immediately so they can save
          setShowSaveDialog(true);
        }

        // Clear after restoring
        sessionStorage.removeItem('pending_interview_save');
      }
    } catch (e) {
      logger.error('Failed to restore interview state', e as Error, {
        module: 'interview-room',
        action: 'restore-state-error',
      });
    }
  }, []);

  // Handle discard interview
  const handleDiscard = useCallback(() => {
    setShowSaveDialog(false);
    router.push('/');
  }, [router]);

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

  // Show preparing state while waiting for resume parsing
  if (isPreparing) {
    return (
      <InterviewerPreparingState
        progress={taskProgress}
        isReady={isReadyToStart}
        onStart={handleStartInterview}
      />
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
            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-terracotta animate-pulse' : 'bg-gray-400'}`}
          />
          {t('liveSession')} • {formatTimeDisplay(elapsedSeconds)}
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
            <span>{getLocalizedError(lastError)}</span>
          </div>
        </div>
      )}

      {/* Main Content Area - Video Preview (Google Meet style) */}
      <main className="z-10 flex w-full flex-1 items-center justify-center p-4">
        <VideoPreview
          stream={videoStream}
          isVideoOn={isVideoOn}
          sessionState={sessionState}
          audioLevel={displayAudioLevel}
          error={videoError}
          isCaptionOn={isCaptionOn}
          interimAiTranscript={interimAiTranscript}
        />
      </main>

      {/* Controls */}
      <div className="z-10 mb-8">
        <ControlBar
          isMicOn={isMicOn}
          isVideoOn={isVideoOn}
          onToggleMic={toggleMic}
          onToggleVideo={toggleVideo}
          onEndCall={handleEndCall}
          isCaptionOn={isCaptionOn}
          onToggleCaption={toggleCaption}
          labels={{
            muteMic: t('muteMic'),
            unmuteMic: t('unmuteMic'),
            turnOffCamera: t('turnOffCamera'),
            turnOnCamera: t('turnOnCamera'),
            endCall: t('endCall'),
            caption: t('caption'),
          }}
        />
      </div>

      {/* Save Confirm Dialog */}
      <SaveConfirmDialog
        isOpen={showSaveDialog}
        onSave={handleSave}
        onDiscard={handleDiscard}
        duration={elapsedSeconds}
        transcriptCount={transcripts.length}
        jobDescriptionUrl={jobDescription?.url}
        isSaving={isSaving}
        errorMessage={saveError}
        isUnauthorized={isSaveUnauthorized}
      />
    </div>
  );
}
