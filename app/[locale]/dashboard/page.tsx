'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Link } from '@heroui/react';
import { Calendar, Award, Clock, ArrowRight } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageLoadingState, PageErrorState } from '@/components/common';
import { StatsCard } from '@/components/user/StatsCard';
import { InterviewCard } from '@/components/history/InterviewCard';
import { useUserStore } from '@/lib/stores/user-store';
import { useSession } from '@/lib/auth/auth-client';
import type { InterviewStatus } from '@/lib/constants/enums';

// ============================================================
// Types
// ============================================================

interface DashboardContentProps {
  userName: string | null | undefined;
}

// ============================================================
// Dashboard Content Component
// ============================================================

function DashboardContent({ userName }: DashboardContentProps) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const { stats, isLoadingStats, error, fetchStats } = useUserStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleViewInterview = (id: string) => {
    router.push(`/history/${id}`);
  };

  // Loading state
  if (isLoadingStats && !stats) {
    return <PageLoadingState />;
  }

  // Error state
  if (error && !stats) {
    return <PageErrorState onRetry={() => fetchStats()} />;
  }

  const displayName = userName || t('welcome');
  const totalInterviews = stats?.totalInterviews ?? 0;
  const averageScore = stats?.averageScore ?? '-';
  const totalPracticeMinutes = stats?.totalPracticeMinutes ?? 0;
  const recentInterviews = stats?.recentInterviews ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-charcoal font-serif text-3xl font-semibold">
          {t('welcome')}, {displayName}
        </h1>
        <p className="text-charcoal/60">{t('title')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title={t('totalInterviews')}
          value={totalInterviews}
          icon={<Calendar className="h-6 w-6" />}
        />
        <StatsCard
          title={t('averageScore')}
          value={averageScore}
          icon={<Award className="h-6 w-6" />}
        />
        <StatsCard
          title={t('improvement')}
          value={`${totalPracticeMinutes}m`}
          subtitle={t('lastWeek')}
          icon={<Clock className="h-6 w-6" />}
        />
      </div>

      {/* Recent Interviews Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-charcoal text-xl font-semibold">{t('recentInterviews')}</h2>
          {recentInterviews.length > 0 && (
            <Button
              as={Link}
              href="/history"
              variant="light"
              size="sm"
              endContent={<ArrowRight className="h-4 w-4" />}
              className="text-terracotta"
            >
              {t('viewAll')}
            </Button>
          )}
        </div>

        {recentInterviews.length === 0 ? (
          <div className="bg-warm-gray/5 border-warm-gray/10 flex flex-col items-center justify-center rounded-xl border py-12">
            <p className="text-charcoal/60 mb-2">{t('noInterviews')}</p>
            <p className="text-charcoal/40 mb-6 text-sm">{t('startFirst')}</p>
            <Button
              as={Link}
              href="/interview/setup"
              color="primary"
              className="bg-terracotta hover:bg-terracotta/90 text-white"
            >
              {tCommon('startInterview')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentInterviews.map((interview) => (
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
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <AuthGuard>
      <DashboardContent userName={session?.user?.name} />
    </AuthGuard>
  );
}
