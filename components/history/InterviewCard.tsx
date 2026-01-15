'use client';

import { Card, CardBody, Button } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, Award, ChevronRight, RefreshCw, Briefcase } from 'lucide-react';
import { StatusChip } from '@/components/common/StatusChip';
import { formatDate, formatDuration } from '@/lib/utils/date-format';
import type { InterviewStatus } from '@/lib/constants/enums';
import type { JobDescriptionData } from '@/lib/types/user';

// ============================================================
// Types
// ============================================================

export interface InterviewCardProps {
  /** Unique interview ID */
  id: string;
  /** Current status of the interview */
  status: InterviewStatus;
  /** Score (0-100) if available */
  score: number | null;
  /** Duration in seconds */
  duration: number | null;
  /** ISO date string of creation */
  createdAt: string;
  /** Job description URL if available */
  jobDescriptionUrl?: string | null;
  /** Full job description object if available */
  jobDescription?: JobDescriptionData | null;
  /** Click handler for viewing details */
  onClick?: () => void;
  /** Click handler for retrying interview with same job description */
  onRetry?: () => void;
}

// ============================================================
// Helper Components
// ============================================================

function InfoItem({ icon: Icon, value }: { icon: React.ElementType; value: string }) {
  return (
    <div className="text-charcoal/60 flex items-center gap-1.5 text-sm">
      <Icon className="h-4 w-4" />
      <span>{value}</span>
    </div>
  );
}

// ============================================================
// Component
// ============================================================

export function InterviewCard({
  status,
  score,
  duration,
  createdAt,
  jobDescriptionUrl,
  jobDescription,
  onClick,
  onRetry,
}: InterviewCardProps) {
  const tHistory = useTranslations('history');

  const formattedDate = formatDate(createdAt);
  const formattedDuration = duration ? formatDuration(duration) : '-';

  // Build card title: prioritize "Company - Position", fallback to "面試歷史"
  const hasJobInfo = jobDescription?.title || jobDescription?.company;
  const cardTitle = hasJobInfo
    ? [jobDescription?.company, jobDescription?.title].filter(Boolean).join(' • ')
    : tHistory('title');

  const handleRetryClick = () => {
    onRetry?.();
  };

  return (
    <Card
      isPressable={!!onClick}
      onPress={onClick}
      className="border-warm-gray/10 hover:border-terracotta/30 group border bg-white/50 shadow-none transition-all hover:shadow-sm"
    >
      <CardBody className="flex flex-row items-center justify-between gap-4 p-4">
        {/* Left section: Title and status */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Title row with icon */}
          <div className="flex items-start gap-3">
            {hasJobInfo && <Briefcase className="text-terracotta mt-0.5 h-5 w-5 flex-shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-charcoal truncate text-base font-semibold">{cardTitle}</h3>
                <StatusChip status={status} />
              </div>
              {/* Show location if available */}
              {jobDescription?.location && (
                <p className="text-charcoal/50 mt-0.5 truncate text-xs">
                  {jobDescription.location}
                </p>
              )}
            </div>
          </div>

          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-4">
            <InfoItem icon={Calendar} value={formattedDate} />
            {duration !== null && <InfoItem icon={Clock} value={formattedDuration} />}
            {score !== null && <InfoItem icon={Award} value={`${tHistory('score')}: ${score}`} />}
          </div>

          {/* View original job link */}
          {(jobDescription?.url || jobDescriptionUrl) && (
            <a
              href={jobDescription?.url || jobDescriptionUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-terracotta hover:text-terracotta/80 block truncate text-xs underline"
              onClick={(e) => e.stopPropagation()}
            >
              {tHistory('viewOriginalJob')}
            </a>
          )}
        </div>

        {/* Right section: Score, retry button, and chevron */}
        <div className="flex items-center gap-3">
          {/* Retry button */}
          {onRetry && hasJobInfo && (
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              color="primary"
              onPress={handleRetryClick}
              className="bg-terracotta/10 text-terracotta hover:bg-terracotta/20"
              aria-label={tHistory('retryInterview')}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {/* Score badge */}
          {score !== null && (
            <div className="bg-terracotta/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
              <span className="text-terracotta text-lg font-bold">{score}</span>
            </div>
          )}

          {/* Chevron */}
          {onClick && (
            <ChevronRight className="text-charcoal/30 group-hover:text-terracotta h-5 w-5 transition-colors" />
          )}
        </div>
      </CardBody>
    </Card>
  );
}
