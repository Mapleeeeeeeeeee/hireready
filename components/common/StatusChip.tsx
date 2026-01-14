'use client';

import { Chip } from '@heroui/react';
import { useTranslations } from 'next-intl';
import type { InterviewStatus } from '@/lib/constants/enums';

// ============================================================
// Types
// ============================================================

export interface StatusChipProps {
  /** The interview status to display */
  status: InterviewStatus;
  /** Size of the chip - sm for cards, md for detail pages */
  size?: 'sm' | 'md';
}

// ============================================================
// Component
// ============================================================

/**
 * StatusChip displays the interview status as a colored chip.
 * Used in interview cards and detail pages.
 */
export function StatusChip({ status, size = 'sm' }: StatusChipProps) {
  const t = useTranslations('history.statuses');

  const statusConfig: Record<InterviewStatus, { color: 'warning' | 'primary' | 'success' }> = {
    pending: { color: 'warning' },
    in_progress: { color: 'primary' },
    completed: { color: 'success' },
  };

  const config = statusConfig[status];

  return (
    <Chip size={size} color={config.color} variant="flat">
      {t(status)}
    </Chip>
  );
}
