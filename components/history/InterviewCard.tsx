'use client';

import { Button } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, ChevronRight, RefreshCw, MapPin, Trash2 } from 'lucide-react';
import { StatusChip } from '@/components/common/StatusChip';
import { formatDate, formatDuration } from '@/lib/utils/date-format';
import { STATUS_ACCENT_COLORS, type InterviewStatus } from '@/lib/constants/enums';
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
  /** Click handler for deleting interview */
  onDelete?: () => void;
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
  onDelete,
}: InterviewCardProps) {
  const tHistory = useTranslations('history');

  const formattedDate = formatDate(createdAt);
  const formattedDuration = duration ? formatDuration(duration) : '-';

  // Build card title info
  const company = jobDescription?.company;
  const position = jobDescription?.title;
  const location = jobDescription?.location;

  // Logic to determine what to show as main title
  // If company exists, show Company as title, Position as subtitle
  // If no company, show Position as title, standard fallback as subtitle
  // If neither, show standard fallback as title

  const displayTitle = company || position || tHistory('title');
  const displaySubtitle = company ? position : null;

  const handleRetryClick = () => {
    // HeroUI uses continuePropagation instead of stopPropagation
    // But we don't call it to prevent the event from bubbling to the Card's onPress
    onRetry?.();
  };

  const handleDeleteClick = () => {
    // HeroUI uses continuePropagation instead of stopPropagation
    // But we don't call it to prevent the event from bubbling to the Card's onPress
    onDelete?.();
  };

  const accentColor = STATUS_ACCENT_COLORS[status] || 'bg-gray-200';

  return (
    <div
      className={`group hover:border-terracotta/30 relative overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex w-full flex-col gap-0 p-0 sm:flex-row">
        {/* Left Accent Bar */}
        <div className={`h-1 w-full shrink-0 sm:h-auto sm:w-1.5 ${accentColor} opacity-80`} />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          {/* Header Row: Date & Status (Mobile) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </span>
              {duration !== null && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formattedDuration}
                  </span>
                </>
              )}
            </div>
            <div className="block sm:hidden">
              <StatusChip status={status} size="sm" />
            </div>
          </div>

          {/* Title Section */}
          <div className="flex flex-col gap-1">
            <h3 className="text-charcoal group-hover:text-terracotta line-clamp-1 text-lg font-bold transition-colors sm:text-xl">
              {displayTitle}
            </h3>
            {displaySubtitle && (
              <p className="text-charcoal/60 line-clamp-1 text-sm">{displaySubtitle}</p>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-1 flex items-center gap-4">
            {location && (
              <div className="text-charcoal/50 flex items-center gap-1 text-xs">
                <MapPin className="h-3.5 w-3.5" />
                <span className="max-w-[150px] truncate">{location}</span>
              </div>
            )}

            {(jobDescription?.url || jobDescriptionUrl) && (
              <a
                href={jobDescription?.url || jobDescriptionUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terracotta hover:text-terracotta/80 relative z-10 text-xs transition-colors hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {tHistory('viewOriginalJob')}
              </a>
            )}
          </div>
        </div>

        {/* Right Section: Actions & Stats (Desktop) */}
        <div className="flex flex-row items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3 sm:min-w-[140px] sm:flex-col sm:justify-center sm:gap-3 sm:border-t-0 sm:border-l sm:py-0">
          {/* Desktop Status */}
          <div className="hidden sm:block">
            <StatusChip status={status} size="sm" />
          </div>

          {/* Score Display */}
          {score !== null ? (
            <div className="flex items-center gap-2 sm:flex-col sm:gap-0">
              <span className="text-sm font-medium text-gray-500 sm:hidden">
                {tHistory('score')}:
              </span>
              <div className="flex flex-col items-center">
                <span className="text-terracotta font-serif text-2xl font-bold sm:text-3xl">
                  {score}
                </span>
                <span className="text-charcoal/40 hidden text-[10px] font-bold tracking-wider uppercase sm:block">
                  {tHistory('scoreLabel')}
                </span>
              </div>
            </div>
          ) : (
            <div className="hidden px-2 text-center sm:block">
              <span className="text-charcoal/30 text-xs italic">{tHistory('noScore')}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {onDelete && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={handleDeleteClick}
                  className="bg-transparent text-gray-300 transition-colors hover:bg-transparent hover:text-red-600 data-[hover=true]:bg-transparent"
                  aria-label={tHistory('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}

              {onRetry && (company || position) && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="primary"
                  onPress={handleRetryClick}
                  className="text-terracotta/70 hover:text-terracotta hover:bg-terracotta/10"
                  aria-label={tHistory('retryInterview')}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>

            {onClick && (
              <>
                <Button
                  isIconOnly={false}
                  className="h-8 w-8 min-w-0 rounded-full bg-transparent p-0 sm:hidden"
                  onPress={onClick}
                >
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Button>

                <div className="hidden sm:block">
                  <ChevronRight className="group-hover:text-terracotta h-5 w-5 text-gray-300 transition-colors" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
