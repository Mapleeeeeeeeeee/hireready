'use client';

import { Card, CardBody } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, Award, ChevronRight, Briefcase } from 'lucide-react';
import { StatusChip } from '@/components/common/StatusChip';
import { formatDate, formatDuration } from '@/lib/utils/date-format';
import type { InterviewStatus } from '@/lib/constants/enums';

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
  jobDescription?: unknown;
  /** Click handler for viewing details */
  onClick?: () => void;
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
}: InterviewCardProps) {
  const tHistory = useTranslations('history');

  // Parse job description
  const jd = jobDescription as {
    title?: string;
    company?: string;
    location?: string;
    url?: string;
  } | null;

  // Use a default title since scenario is deprecated
  const cardTitle = tHistory('title');
  const formattedDate = formatDate(createdAt);
  const formattedDuration = duration ? formatDuration(duration) : '-';

  return (
    <Card
      isPressable={!!onClick}
      onPress={onClick}
      className="border-warm-gray/10 hover:border-terracotta/30 group border bg-white/50 shadow-none transition-all hover:shadow-sm"
    >
      <CardBody className="flex flex-row items-center justify-between gap-4 p-4">
        {/* Left section: Title and status */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-charcoal text-base font-semibold">{cardTitle}</h3>
            <StatusChip status={status} />
          </div>

          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-4">
            <InfoItem icon={Calendar} value={formattedDate} />
            {duration !== null && <InfoItem icon={Clock} value={formattedDuration} />}
            {score !== null && <InfoItem icon={Award} value={`${tHistory('score')}: ${score}`} />}
          </div>

          {/* Job Description Info */}
          {jd && (
            <div className="border-warm-gray/10 mt-3 border-t pt-3">
              <div className="flex items-start gap-2">
                <Briefcase className="text-terracotta mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-charcoal truncate text-sm font-medium">
                    {jd.title || tHistory('jobPosition')}
                  </p>
                  {jd.company && <p className="text-charcoal/60 truncate text-xs">{jd.company}</p>}
                  {jd.location && (
                    <p className="text-charcoal/60 truncate text-xs">{jd.location}</p>
                  )}
                  {(jd.url || jobDescriptionUrl) && (
                    <a
                      href={jd.url || jobDescriptionUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-terracotta hover:text-terracotta/80 block truncate text-xs underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tHistory('viewOriginalJob')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
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
