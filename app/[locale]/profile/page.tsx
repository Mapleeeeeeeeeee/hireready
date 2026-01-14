'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Spinner } from '@heroui/react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ProfileForm } from '@/components/user/ProfileForm';
import { useUserStore } from '@/lib/stores/user-store';

// ============================================================
// Profile Content Component
// ============================================================

function ProfileContent() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');

  const { profile, isLoadingProfile, error, fetchProfile } = useUserStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Loading state
  if (isLoadingProfile && !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" color="primary" label={tCommon('loading')} />
      </div>
    );
  }

  // Error state
  if (error && !profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-charcoal/60">{tCommon('error')}</p>
        <Button color="primary" variant="flat" onPress={() => fetchProfile()}>
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

      {/* Profile Form */}
      <ProfileForm />
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
