'use client';

import { Chip } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { STATUS_COLORS, type InterviewStatus } from '@/lib/constants/enums';

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

  return (
    <Chip size={size} color={STATUS_COLORS[status]} variant="flat">
      {t(status)}
    </Chip>
  );
}
