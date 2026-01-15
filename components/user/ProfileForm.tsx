'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardBody, CardHeader, Button, Input, Divider } from '@heroui/react';
import { User, Mail, Calendar, Pencil, Check, X, FileUser, Loader2 } from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { useSession, updateUser } from '@/lib/auth/auth-client';
import { formatDateLong } from '@/lib/utils/date-format';
import { ResumeUpload, ResumeCard, ResumePreview } from '@/components/resume';
import { useResumeManager } from '@/lib/hooks/use-resume-manager';

// ============================================================
// Types
// ============================================================

export interface ProfileFormProps {
  /** Callback when profile is successfully updated */
  onUpdate?: () => void;
}

// ============================================================
// Helper Components
// ============================================================

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="bg-terracotta/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
        <Icon className="text-terracotta h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-charcoal/60 text-sm">{label}</span>
        <span className="text-charcoal font-medium">{value}</span>
      </div>
    </div>
  );
}

// ============================================================
// Component
// ============================================================

export function ProfileForm({ onUpdate }: ProfileFormProps) {
  const t = useTranslations('profile');
  const { profile, fetchProfile } = useUserStore();
  const { refetch: refetchSession } = useSession();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(profile?.name || '');

  // Use the resume manager hook
  const {
    resume,
    isLoadingResume,
    isDeletingResume,
    isPreviewOpen,
    isReplacing,
    handleResumeUploadSuccess,
    handleResumePreview,
    handleResumeReplace,
    handleResumeDelete,
    handleCancelReplace,
    handleClosePreview,
  } = useResumeManager();

  const handleEdit = useCallback(() => {
    setName(profile?.name || '');
    setIsEditing(true);
  }, [profile?.name]);

  const handleCancel = useCallback(() => {
    setName(profile?.name || '');
    setIsEditing(false);
  }, [profile?.name]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      // Use better-auth's updateUser to update user data
      // This automatically updates the session and triggers UI refresh
      const { error } = await updateUser({ name: name.trim() });

      if (!error) {
        // Refetch session to ensure Navbar updates immediately
        await refetchSession();
        // Also refresh our local profile store
        await fetchProfile();
        setIsEditing(false);
        onUpdate?.();
      }
    } finally {
      setIsSaving(false);
    }
  }, [name, refetchSession, fetchProfile, onUpdate]);

  if (!profile) {
    return null;
  }

  const memberSinceDate = formatDateLong(profile.createdAt);

  return (
    <>
      <Card className="border-warm-gray/10 border bg-white/50 shadow-none">
        <CardHeader className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <User className="text-terracotta h-5 w-5" />
            <h2 className="text-charcoal text-lg font-semibold">{t('title')}</h2>
          </div>
          {!isEditing && (
            <Button
              size="sm"
              variant="light"
              startContent={<Pencil className="h-4 w-4" />}
              onPress={handleEdit}
              className="text-charcoal/60 hover:text-charcoal"
            >
              {t('editProfile')}
            </Button>
          )}
        </CardHeader>

        <Divider className="bg-warm-gray/20" />

        <CardBody className="space-y-6 pt-6">
          {/* Name Field */}
          {isEditing ? (
            <div className="space-y-2">
              <label className="text-charcoal/70 text-sm font-medium">{t('name')}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('name')}
                variant="bordered"
                size="lg"
                classNames={{
                  input: 'text-charcoal',
                  inputWrapper: 'border-warm-gray/30 hover:border-terracotta/50',
                }}
                startContent={<User className="text-charcoal/40 h-4 w-4" />}
              />
            </div>
          ) : (
            <InfoRow icon={User} label={t('name')} value={profile.name || '-'} />
          )}

          {/* Email Field (Always Read-only) */}
          <InfoRow icon={Mail} label={t('email')} value={profile.email} />

          {/* Member Since (Always Read-only) */}
          <InfoRow icon={Calendar} label={t('memberSince')} value={memberSinceDate} />

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex items-center gap-3 pt-4">
              <Button
                color="primary"
                variant="solid"
                isLoading={isSaving}
                isDisabled={!name.trim() || name.trim() === profile.name}
                onPress={handleSave}
                startContent={!isSaving && <Check className="h-4 w-4" />}
                className="bg-terracotta hover:bg-terracotta/90 text-white"
              >
                {t('saveChanges')}
              </Button>
              <Button
                variant="light"
                onPress={handleCancel}
                isDisabled={isSaving}
                startContent={<X className="h-4 w-4" />}
                className="text-charcoal/60 hover:text-charcoal"
              >
                {t('cancel')}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Resume Section */}
      <Card className="border-warm-gray/10 border bg-white/50 shadow-none">
        <CardHeader className="flex items-center gap-2 pb-2">
          <FileUser className="text-terracotta h-5 w-5" />
          <h2 className="text-charcoal text-lg font-semibold">{t('resume')}</h2>
        </CardHeader>
        <Divider className="bg-warm-gray/20" />
        <CardBody className="pt-6">
          {isLoadingResume ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-terracotta h-6 w-6 animate-spin" />
            </div>
          ) : resume && !isReplacing ? (
            <ResumeCard
              resume={resume}
              onPreview={handleResumePreview}
              onReplace={handleResumeReplace}
              onDelete={handleResumeDelete}
              isDeleting={isDeletingResume}
            />
          ) : (
            <div className="space-y-4">
              <ResumeUpload onUploadSuccess={handleResumeUploadSuccess} />
              {isReplacing && (
                <Button variant="light" onPress={handleCancelReplace} className="text-charcoal/60">
                  {t('cancel')}
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Resume Preview Modal */}
      {resume && (
        <ResumePreview
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          url={resume.url}
          fileName={resume.fileName}
        />
      )}
    </>
  );
}
