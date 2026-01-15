'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardBody, Tabs, Tab, Tooltip } from '@heroui/react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Award,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageLoadingState, StatusChip } from '@/components/common';
import { TranscriptViewer, type TranscriptEntry } from '@/components/history/TranscriptViewer';
import { AudioPlayer } from '@/components/history/AudioPlayer';
import { DeleteConfirmDialog } from '@/components/history';
import { useUserStore } from '@/lib/stores/user-store';
import { useInterviewStore } from '@/lib/stores/interview-store';
import { toJobDescription } from '@/lib/jd';
import { formatDate, formatDateLong, formatDuration } from '@/lib/utils/date-format';
import type { InterviewStatus } from '@/lib/constants/enums';

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
  const params = useParams();
  const router = useRouter();

  const interviewId = params.id as string;

  const {
    selectedInterview,
    isLoadingInterviewDetail,
    isDeletingInterview,
    error,
    fetchInterviewById,
    clearSelectedInterview,
    deleteInterview,
  } = useUserStore();

  const setJobDescription = useInterviewStore((state) => state.setJobDescription);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (interviewId) {
      fetchInterviewById(interviewId);
    }

    return () => {
      clearSelectedInterview();
    };
  }, [interviewId, fetchInterviewById, clearSelectedInterview]);

  const handleRetry = () => {
    if (!selectedInterview?.jobDescription) return;

    setJobDescription(toJobDescription(selectedInterview.jobDescription));
    router.push('/interview/setup');
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInterview) return;
    const success = await deleteInterview(selectedInterview.id);
    if (success) {
      setDeleteDialogOpen(false);
      router.replace('/history');
    }
  };

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
  const score = interview.score;
  const formattedDate = formatDateLong(interview.createdAt);
  const formattedDuration = interview.duration ? formatDuration(interview.duration) : '-';

  // Parse transcript if it exists
  const transcript: TranscriptEntry[] = Array.isArray(interview.transcript)
    ? (interview.transcript as TranscriptEntry[])
    : [];

  // Get model answer (properly typed from store)
  const modelAnswer = interview.modelAnswer;

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
              <h1 className="text-charcoal font-serif text-2xl font-semibold">{t('title')}</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Actions */}
              {interview.jobDescription && (
                <Tooltip content={t('retryInterview')}>
                  <Button
                    isIconOnly
                    variant="light"
                    onPress={handleRetry}
                    className="text-terracotta/70 hover:text-terracotta hover:bg-terracotta/10"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                </Tooltip>
              )}

              <Tooltip content={t('delete')}>
                <Button
                  isIconOnly
                  variant="light"
                  onPress={handleDelete}
                  className="text-gray-300 transition-colors hover:text-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </Tooltip>

              <div className="mx-1 h-6 w-px bg-gray-200" />

              <StatusChip status={interview.status as InterviewStatus} size="md" />
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem icon={Calendar} label={t('date')} value={formattedDate} />
            <InfoItem icon={Clock} label={t('duration')} value={formattedDuration} />
            <InfoItem
              icon={Award}
              label={t('score')}
              value={score !== null ? String(score) : '-'}
            />
          </div>

          {/* Score Highlight */}
          {score !== null && (
            <div className="bg-terracotta/5 border-terracotta/10 flex items-center justify-center rounded-xl border py-6">
              <div className="text-center">
                <p className="text-charcoal/60 mb-1 text-sm">{t('score')}</p>
                <p className="text-terracotta text-5xl font-bold">{score}</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Job Description Section */}
      {(interview.jobDescriptionUrl || interview.jobDescription) && (
        <Card className="border-warm-gray/10 border bg-white/50 shadow-none">
          <CardBody className="space-y-3 p-6">
            <div className="flex items-center gap-2">
              <Briefcase className="text-terracotta h-5 w-5" />
              <h2 className="text-charcoal font-semibold">{t('jobPosition')}</h2>
            </div>
            <div className="space-y-1">
              {interview.jobDescription?.title && (
                <p className="text-charcoal text-sm font-medium">
                  {interview.jobDescription.title}
                </p>
              )}
              {interview.jobDescription?.company && (
                <p className="text-charcoal/60 text-sm">{interview.jobDescription.company}</p>
              )}
              {(interview.jobDescription?.url || interview.jobDescriptionUrl) && (
                <a
                  href={interview.jobDescription?.url || interview.jobDescriptionUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-terracotta hover:text-terracotta/80 inline-flex items-center gap-1 text-sm underline"
                >
                  {t('viewOriginalJob')}
                </a>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Strengths Section */}
      {interview.strengths &&
        Array.isArray(interview.strengths) &&
        interview.strengths.length > 0 && (
          <Card className="border-warm-gray/10 border bg-white/50 shadow-none">
            <CardBody className="space-y-3 p-6">
              <h2 className="text-charcoal flex items-center gap-2 font-semibold">
                <CheckCircle className="h-5 w-5 text-green-600" />
                {t('strengths')}
              </h2>
              <ul className="space-y-2">
                {(interview.strengths as string[]).map((strength, idx) => (
                  <li key={idx} className="text-charcoal/80 flex gap-2 text-sm">
                    <span className="mt-1 text-xs text-green-600">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}

      {/* Improvements Section */}
      {interview.improvements &&
        Array.isArray(interview.improvements) &&
        interview.improvements.length > 0 && (
          <Card className="border-warm-gray/10 border bg-white/50 shadow-none">
            <CardBody className="space-y-3 p-6">
              <h2 className="text-charcoal flex items-center gap-2 font-semibold">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                {t('improvements')}
              </h2>
              <ul className="space-y-2">
                {(interview.improvements as string[]).map((improvement, idx) => (
                  <li key={idx} className="text-charcoal/80 flex gap-2 text-sm">
                    <span className="mt-1 text-xs text-orange-600">•</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeletingInterview}
        interviewInfo={{
          title: interview.jobDescription?.company || interview.jobDescription?.title || t('title'),
          date: formatDate(interview.createdAt),
        }}
      />
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
