'use client';

import { useEffect, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Pagination } from '@heroui/react';
import { ClipboardList } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageLoadingState, PageErrorState, EmptyState } from '@/components/common';
import { InterviewCard, DeleteConfirmDialog } from '@/components/history';
import { useUserStore, selectTotalPages } from '@/lib/stores/user-store';
import { useInterviewStore } from '@/lib/stores/interview-store';
import { toJobDescription } from '@/lib/jd';
import { formatDate } from '@/lib/utils/date-format';
import type { InterviewStatus } from '@/lib/constants/enums';
import type { JobDescriptionData, InterviewListItem } from '@/lib/types/user';

// ============================================================
// History Content Component
// ============================================================

function HistoryContent() {
  const t = useTranslations('history');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const {
    interviews,
    interviewsPage,
    interviewsTotal,
    isLoadingInterviews,
    isDeletingInterview,
    error,
    fetchInterviews,
    deleteInterview,
  } = useUserStore();

  const setJobDescription = useInterviewStore((state) => state.setJobDescription);

  const totalPages = useUserStore(selectTotalPages);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const handlePageChange = useCallback(
    (page: number) => {
      fetchInterviews({ page });
    },
    [fetchInterviews]
  );

  const handleViewInterview = useCallback(
    (id: string) => {
      router.push(`/history/${id}`);
    },
    [router]
  );

  const handleRetryInterview = useCallback(
    (jobDescription: JobDescriptionData) => {
      setJobDescription(toJobDescription(jobDescription));
      router.push('/interview/setup');
    },
    [setJobDescription, router]
  );

  // Delete interview state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<InterviewListItem | null>(null);

  const handleDeleteClick = useCallback((interview: InterviewListItem) => {
    setInterviewToDelete(interview);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setInterviewToDelete(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!interviewToDelete) return;

    const success = await deleteInterview(interviewToDelete.id);
    if (success) {
      setDeleteDialogOpen(false);
      setInterviewToDelete(null);
    }
  }, [interviewToDelete, deleteInterview]);

  // Loading state
  if (isLoadingInterviews && interviews.length === 0) {
    return <PageLoadingState />;
  }

  // Error state
  if (error && interviews.length === 0) {
    return <PageErrorState onRetry={() => fetchInterviews()} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-charcoal font-serif text-3xl font-semibold">{t('title')}</h1>
        <p className="text-charcoal/60">{t('subtitle')}</p>
      </div>

      {/* Interview List */}
      {interviews.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t('empty')}
          description={t('emptyDescription')}
          actionLabel={tCommon('startInterview')}
          actionHref="/interview/setup"
        />
      ) : (
        <>
          <div className="space-y-3">
            {interviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                id={interview.id}
                status={interview.status as InterviewStatus}
                score={interview.score}
                duration={interview.duration}
                createdAt={interview.createdAt}
                jobDescriptionUrl={interview.jobDescriptionUrl}
                jobDescription={interview.jobDescription}
                onClick={() => handleViewInterview(interview.id)}
                onRetry={
                  interview.jobDescription
                    ? () => handleRetryInterview(interview.jobDescription!)
                    : undefined
                }
                onDelete={() => handleDeleteClick(interview)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center pt-4">
              <Pagination
                total={totalPages}
                page={interviewsPage}
                onChange={handlePageChange}
                showControls
                isDisabled={isLoadingInterviews}
                classNames={{
                  cursor: 'bg-terracotta',
                }}
              />
            </div>
          )}

          {/* Total count */}
          <p className="text-charcoal/40 text-center text-sm">
            {t('interviewCount', { count: interviewsTotal })}
          </p>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeletingInterview}
        interviewInfo={
          interviewToDelete
            ? {
                title:
                  interviewToDelete.jobDescription?.company ||
                  interviewToDelete.jobDescription?.title ||
                  t('title'),
                date: formatDate(interviewToDelete.createdAt),
              }
            : undefined
        }
      />
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function HistoryPage() {
  return (
    <AuthGuard>
      <HistoryContent />
    </AuthGuard>
  );
}
