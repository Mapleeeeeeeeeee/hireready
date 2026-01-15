'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardBody, Tabs, Tab } from '@heroui/react';
import { ArrowLeft, Calendar, Clock, Award, Briefcase } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageLoadingState, StatusChip } from '@/components/common';
import { TranscriptViewer, type TranscriptEntry } from '@/components/history/TranscriptViewer';
import { AudioPlayer } from '@/components/history/AudioPlayer';
import { useUserStore } from '@/lib/stores/user-store';
import { formatDateLong, formatDuration } from '@/lib/utils/date-format';
import type { InterviewStatus } from '@/lib/constants/enums';
import type { ModelAnswer } from '@/lib/types/interview';

// ============================================================
// Types
// ============================================================

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
}

// ============================================================
// Helper Components
// ============================================================

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-terracotta/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
        <Icon className="text-terracotta h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-charcoal/60 text-sm">{label}</span>
        <span className="text-charcoal font-medium">{value}</span>
      </div>
    </div>
  );
}

// ============================================================
// History Detail Content Component
// ============================================================

function HistoryDetailContent() {
  const t = useTranslations('history');
  const tCommon = useTranslations('common');
  const tScenarios = useTranslations('interview.scenarios');
  const params = useParams();
  const router = useRouter();

  const interviewId = params.id as string;

  const {
    selectedInterview,
    isLoadingInterviewDetail,
    error,
    fetchInterviewById,
    clearSelectedInterview,
  } = useUserStore();

  useEffect(() => {
    if (interviewId) {
      fetchInterviewById(interviewId);
    }

    return () => {
      clearSelectedInterview();
    };
  }, [interviewId, fetchInterviewById, clearSelectedInterview]);

  const handleBack = () => {
    router.push('/history');
  };

  // Loading state
  if (isLoadingInterviewDetail) {
    return <PageLoadingState />;
  }

  // Error state
  if (error || !selectedInterview) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-charcoal/60">{error ? tCommon('error') : t('notFound')}</p>
        <Button color="primary" variant="flat" onPress={handleBack}>
          {t('backToHistory')}
        </Button>
      </div>
    );
  }

  const interview = selectedInterview;
  const scenarioLabel =
    tScenarios(interview.scenario as Parameters<typeof tScenarios>[0]) || interview.scenario;
  const formattedDate = formatDateLong(interview.createdAt);
  const formattedDuration = interview.duration ? formatDuration(interview.duration) : '-';

  // Parse transcript if it exists
  const transcript: TranscriptEntry[] = Array.isArray(interview.transcript)
    ? (interview.transcript as TranscriptEntry[])
    : [];

  // Parse model answer if it exists
  const modelAnswer: ModelAnswer | null = interview.modelAnswer
    ? (interview.modelAnswer as ModelAnswer)
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Back Button */}
      <Button
        variant="light"
        startContent={<ArrowLeft className="h-4 w-4" />}
        onPress={handleBack}
        className="text-charcoal/60 hover:text-charcoal -ml-2"
      >
        {t('backToHistory')}
      </Button>

      {/* Header Card */}
      <Card className="border-warm-gray/10 border bg-white/50 shadow-none">
        <CardBody className="space-y-6 p-6">
          {/* Title and Status */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-charcoal font-serif text-2xl font-semibold">{scenarioLabel}</h1>
              <p className="text-charcoal/60 text-sm">{t('title')}</p>
            </div>
            <StatusChip status={interview.status as InterviewStatus} size="md" />
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem icon={Calendar} label={t('date')} value={formattedDate} />
            <InfoItem icon={Clock} label={t('duration')} value={formattedDuration} />
            <InfoItem icon={Award} label={t('score')} value={interview.score ?? '-'} />
            <InfoItem icon={Briefcase} label={t('scenario')} value={scenarioLabel} />
          </div>

          {/* Score Highlight */}
          {interview.score !== null && (
            <div className="bg-terracotta/5 border-terracotta/10 flex items-center justify-center rounded-xl border py-6">
              <div className="text-center">
                <p className="text-charcoal/60 mb-1 text-sm">{t('score')}</p>
                <p className="text-terracotta text-5xl font-bold">{interview.score}</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Job Description Section */}
      {interview.jobDescriptionUrl && (
        <Card className="border-warm-gray/10 border bg-white/50 shadow-none">
          <CardBody className="space-y-3 p-6">
            <div className="flex items-center gap-2">
              <Briefcase className="text-terracotta h-5 w-5" />
              <h2 className="text-charcoal font-semibold">{t('jobPosition')}</h2>
            </div>
            <a
              href={interview.jobDescriptionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-terracotta hover:text-terracotta/80 text-sm break-all underline"
            >
              {interview.jobDescriptionUrl}
            </a>
          </CardBody>
        </Card>
      )}

      {/* Transcript Comparison Section */}
      {modelAnswer ? (
        <Card className="border-warm-gray/10 border bg-white/50 shadow-none">
          <CardBody className="p-6">
            <Tabs aria-label={t('transcriptTabs')}>
              {/* Your Answer Tab */}
              <Tab key="user" title={t('yourAnswer')}>
                <TranscriptViewer transcript={transcript} />
              </Tab>

              {/* Model Answer Tab */}
              <Tab key="model" title={t('modelAnswer')}>
                <div className="space-y-4">
                  {/* Audio Player for TTS */}
                  {modelAnswer.audioUrl && <AudioPlayer src={modelAnswer.audioUrl} />}

                  {/* Model Transcript */}
                  <TranscriptViewer transcript={modelAnswer.transcript as TranscriptEntry[]} />
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>
      ) : (
        /* If no model answer, just show the transcript directly */
        <TranscriptViewer transcript={transcript} />
      )}
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function HistoryDetailPage() {
  return (
    <AuthGuard>
      <HistoryDetailContent />
    </AuthGuard>
  );
}
