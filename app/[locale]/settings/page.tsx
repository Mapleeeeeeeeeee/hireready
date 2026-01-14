'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Spinner } from '@heroui/react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { SettingsForm } from '@/components/user/SettingsForm';
import { useUserStore } from '@/lib/stores/user-store';

// ============================================================
// Settings Content Component
// ============================================================

function SettingsContent() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  const { settings, isLoadingSettings, error, fetchSettings } = useUserStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Loading state
  if (isLoadingSettings && !settings) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" color="primary" label={tCommon('loading')} />
      </div>
    );
  }

  // Error state
  if (error && !settings) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-charcoal/60">{tCommon('error')}</p>
        <Button color="primary" variant="flat" onPress={() => fetchSettings()}>
          {tCommon('retry')}
        </Button>
      </div>
    );
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
