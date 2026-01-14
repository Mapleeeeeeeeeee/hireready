'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardBody, CardHeader, Button, Input, Divider } from '@heroui/react';
import { User, Mail, Calendar, Pencil, Check, X } from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { formatDateLong } from '@/lib/utils/date-format';

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
  const { profile, isLoadingProfile, updateProfile } = useUserStore();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');

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

    await updateProfile({ name: name.trim() });
    setIsEditing(false);
    onUpdate?.();
  }, [name, updateProfile, onUpdate]);

  if (!profile) {
    return null;
  }

  const memberSinceDate = formatDateLong(profile.createdAt);

  return (
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
              isLoading={isLoadingProfile}
              isDisabled={!name.trim() || name.trim() === profile.name}
              onPress={handleSave}
              startContent={!isLoadingProfile && <Check className="h-4 w-4" />}
              className="bg-terracotta hover:bg-terracotta/90 text-white"
            >
              {t('saveChanges')}
            </Button>
            <Button
              variant="light"
              onPress={handleCancel}
              isDisabled={isLoadingProfile}
              startContent={<X className="h-4 w-4" />}
              className="text-charcoal/60 hover:text-charcoal"
            >
              {t('cancel')}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
