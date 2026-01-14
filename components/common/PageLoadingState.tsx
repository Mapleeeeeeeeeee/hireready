'use client';

import { Spinner } from '@heroui/react';
import { useTranslations } from 'next-intl';

// ============================================================
// Component
// ============================================================

/**
 * PageLoadingState displays a centered loading spinner.
 * Used as a consistent loading state across pages.
 */
export function PageLoadingState() {
  const t = useTranslations('common');

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" color="primary" label={t('loading')} />
    </div>
  );
}
