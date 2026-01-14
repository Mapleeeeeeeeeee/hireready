'use client';

import { Card, CardBody, Chip } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, Award, ChevronRight } from 'lucide-react';

// ============================================================
// Types
// ============================================================

export type InterviewStatus = 'pending' | 'in_progress' | 'completed';

export interface InterviewCardProps {
  /** Unique interview ID */
  id: string;
  /** Interview scenario type */
  scenario: string;
  /** Current status of the interview */
  status: InterviewStatus;
  /** Score (0-100) if available */
  score: number | null;
  /** Duration in seconds */
  duration: number | null;
  /** ISO date string of creation */
  createdAt: string;
  /** Click handler for viewing details */
  onClick?: () => void;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Format duration from seconds to human readable string
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format date string to localized date
 */
function formatDate(dateString: string, locale: string = 'en'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================
// Helper Components
// ============================================================

function StatusChip({ status }: { status: InterviewStatus }) {
  const t = useTranslations('history.statuses');

  const statusConfig: Record<InterviewStatus, { color: 'warning' | 'primary' | 'success' }> = {
    pending: { color: 'warning' },
    in_progress: { color: 'primary' },
    completed: { color: 'success' },
  };

  const config = statusConfig[status];

  return (
    <Chip size="sm" color={config.color} variant="flat">
      {t(status)}
    </Chip>
  );
}

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
  scenario,
  status,
  score,
  duration,
  createdAt,
  onClick,
}: InterviewCardProps) {
  const t = useTranslations('interview.scenarios');
  const tHistory = useTranslations('history');

  const scenarioLabel = t(scenario as Parameters<typeof t>[0]) || scenario;
  const formattedDate = formatDate(createdAt);
  const formattedDuration = duration ? formatDuration(duration) : '-';

  return (
    <Card
      isPressable={!!onClick}
      onPress={onClick}
      className="border-warm-gray/10 hover:border-terracotta/30 group border bg-white/50 shadow-none transition-all hover:shadow-sm"
    >
      <CardBody className="flex flex-row items-center justify-between gap-4 p-4">
        {/* Left section: Scenario and status */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-charcoal text-base font-semibold">{scenarioLabel}</h3>
            <StatusChip status={status} />
          </div>

          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-4">
            <InfoItem icon={Calendar} value={formattedDate} />
            {duration !== null && <InfoItem icon={Clock} value={formattedDuration} />}
            {score !== null && <InfoItem icon={Award} value={`${tHistory('score')}: ${score}`} />}
          </div>
        </div>

        {/* Right section: Score highlight and chevron */}
        <div className="flex items-center gap-3">
          {score !== null && (
            <div className="bg-terracotta/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
              <span className="text-terracotta text-lg font-bold">{score}</span>
            </div>
          )}
          {onClick && (
            <ChevronRight className="text-charcoal/30 group-hover:text-terracotta h-5 w-5 transition-colors" />
          )}
        </div>
      </CardBody>
    </Card>
  );
}
