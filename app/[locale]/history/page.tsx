'use client';

import { useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Pagination, Link } from '@heroui/react';
import { ClipboardList, ArrowRight } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageLoadingState, PageErrorState } from '@/components/common';
import { InterviewCard } from '@/components/history/InterviewCard';
import { useUserStore, selectTotalPages } from '@/lib/stores/user-store';
import type { InterviewStatus } from '@/lib/constants/enums';

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
    error,
    fetchInterviews,
  } = useUserStore();

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
        <div className="bg-warm-gray/5 border-warm-gray/10 flex flex-col items-center justify-center rounded-xl border py-16">
          <div className="bg-warm-gray/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <ClipboardList className="text-charcoal/30 h-8 w-8" />
          </div>
          <p className="text-charcoal/60 mb-2 text-lg">{t('empty')}</p>
          <p className="text-charcoal/40 mb-6 text-sm">{t('emptyDescription')}</p>
          <Button
            as={Link}
            href="/interview/setup"
            color="primary"
            endContent={<ArrowRight className="h-4 w-4" />}
            className="bg-terracotta hover:bg-terracotta/90 text-white"
          >
            {tCommon('startInterview')}
          </Button>
        </div>
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
                onClick={() => handleViewInterview(interview.id)}
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
