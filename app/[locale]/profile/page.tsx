'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageLoadingState, PageErrorState } from '@/components/common';
import { ProfileForm } from '@/components/user/ProfileForm';
import { useUserStore } from '@/lib/stores/user-store';

// ============================================================
// Profile Content Component
// ============================================================

function ProfileContent() {
  const t = useTranslations('profile');

  const { profile, isLoadingProfile, error, fetchProfile } = useUserStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Loading state
  if (isLoadingProfile && !profile) {
    return <PageLoadingState />;
  }

  // Error state
  if (error && !profile) {
    return <PageErrorState onRetry={() => fetchProfile()} />;
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
