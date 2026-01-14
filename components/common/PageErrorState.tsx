'use client';

import { Button } from '@heroui/react';
import { useTranslations } from 'next-intl';

// ============================================================
// Types
// ============================================================

export interface PageErrorStateProps {
  /** Callback function to retry the failed operation */
  onRetry: () => void;
}

// ============================================================
// Component
// ============================================================

/**
 * PageErrorState displays a centered error message with a retry button.
 * Used as a consistent error state across pages.
 */
export function PageErrorState({ onRetry }: PageErrorStateProps) {
  const t = useTranslations('common');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-charcoal/60">{t('error')}</p>
      <Button color="primary" variant="flat" onPress={onRetry}>
        {t('retry')}
      </Button>
    </div>
  );
}
