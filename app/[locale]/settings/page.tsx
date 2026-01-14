'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageLoadingState, PageErrorState } from '@/components/common';
import { SettingsForm } from '@/components/user/SettingsForm';
import { useUserStore } from '@/lib/stores/user-store';

// ============================================================
// Settings Content Component
// ============================================================

function SettingsContent() {
  const t = useTranslations('settings');

  const { settings, isLoadingSettings, error, fetchSettings } = useUserStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Loading state
  if (isLoadingSettings && !settings) {
    return <PageLoadingState />;
  }

  // Error state
  if (error && !settings) {
    return <PageErrorState onRetry={() => fetchSettings()} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-charcoal font-serif text-3xl font-semibold">{t('title')}</h1>
        <p className="text-charcoal/60">{t('subtitle')}</p>
      </div>

      {/* Settings Form */}
      <SettingsForm />
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
