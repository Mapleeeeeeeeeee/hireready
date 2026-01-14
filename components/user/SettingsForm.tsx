'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import type { Selection } from '@heroui/react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Select,
  SelectItem,
  Switch,
  Divider,
  addToast,
} from '@heroui/react';
import { Settings, Globe, Palette, Bell, Check } from 'lucide-react';
import { useUserStore, type UserSettingsInput, type UserSettings } from '@/lib/stores/user-store';
import type { NotificationSettings } from '@/lib/types/user';

// ============================================================
// Types
// ============================================================

export interface SettingsFormProps {
  /** Callback when settings are successfully updated */
  onUpdate?: () => void;
}

type ThemeOption = 'light' | 'dark' | 'system';
type LanguageOption = 'zh-TW' | 'en';

interface SettingsFormInnerProps {
  settings: UserSettings;
  isLoadingSettings: boolean;
  updateSettings: (data: Partial<UserSettingsInput>) => Promise<void>;
  onUpdate?: () => void;
}

// ============================================================
// Constants
// ============================================================

const LANGUAGES: { value: LanguageOption; labelKey: string }[] = [
  { value: 'zh-TW', labelKey: 'interview.setup.languages.zhTW' },
  { value: 'en', labelKey: 'interview.setup.languages.en' },
];

const THEMES: { value: ThemeOption; labelKey: string }[] = [
  { value: 'light', labelKey: 'settings.themes.light' },
  { value: 'dark', labelKey: 'settings.themes.dark' },
  { value: 'system', labelKey: 'settings.themes.system' },
];

// ============================================================
// Helper Components
// ============================================================

function SettingSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="bg-terracotta/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
          <Icon className="text-terracotta h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-charcoal font-medium">{title}</span>
          <span className="text-charcoal/60 text-sm">{description}</span>
        </div>
      </div>
      <div className="sm:ml-auto">{children}</div>
    </div>
  );
}

function NotificationToggle({
  label,
  checked,
  onChange,
  isDisabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  isDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-charcoal/80 text-sm">{label}</span>
      <Switch
        isSelected={checked}
        onValueChange={onChange}
        isDisabled={isDisabled}
        size="sm"
        classNames={{
          wrapper: 'group-data-[selected=true]:bg-terracotta',
        }}
      />
    </div>
  );
}

// ============================================================
// Inner Component (receives settings as props, resets on key change)
// ============================================================

function SettingsFormInner({
  settings,
  isLoadingSettings,
  updateSettings,
  onUpdate,
}: SettingsFormInnerProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  // Local state for form values - initialized from settings prop
  const [language, setLanguage] = useState<LanguageOption>(
    (settings.preferredLanguage as LanguageOption) || 'en'
  );
  const [theme, setTheme] = useState<ThemeOption>((settings.theme as ThemeOption) || 'system');
  const [notifications, setNotifications] = useState<NotificationSettings>(
    settings.notifications || { email: true, push: false }
  );

  const handleLanguageChange = useCallback((keys: Selection) => {
    if (keys !== 'all' && keys.size > 0) {
      const selectedKey = Array.from(keys)[0] as LanguageOption;
      setLanguage(selectedKey);
    }
  }, []);

  const handleThemeChange = useCallback((keys: Selection) => {
    if (keys !== 'all' && keys.size > 0) {
      const selectedKey = Array.from(keys)[0] as ThemeOption;
      setTheme(selectedKey);
    }
  }, []);

  const handleNotificationChange = useCallback(
    (key: keyof NotificationSettings, value: boolean) => {
      setNotifications((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    const data: UserSettingsInput = {
      preferredLanguage: language,
      theme,
      notifications,
    };

    await updateSettings(data);

    // Show success toast
    addToast({
      title: t('settings.saved'),
      color: 'success',
    });

    // If language changed, redirect to the new locale
    const currentLocale = pathname.split('/')[1];
    if (language !== currentLocale && (language === 'zh-TW' || language === 'en')) {
      const newPathname = pathname.replace(`/${currentLocale}`, `/${language}`);
      router.push(newPathname);
    }

    onUpdate?.();
  }, [language, theme, notifications, updateSettings, t, pathname, router, onUpdate]);

  return (
    <Card className="border-warm-gray/10 border bg-white/50 shadow-none">
      <CardHeader className="flex items-center gap-2 pb-2">
        <Settings className="text-terracotta h-5 w-5" />
        <h2 className="text-charcoal text-lg font-semibold">{t('settings.title')}</h2>
      </CardHeader>

      <Divider className="bg-warm-gray/20" />

      <CardBody className="space-y-8 pt-6">
        {/* Language Setting */}
        <SettingSection
          icon={Globe}
          title={t('settings.language')}
          description={t('settings.languageDescription')}
        >
          <Select
            selectedKeys={new Set([language])}
            onSelectionChange={handleLanguageChange}
            className="w-40"
            size="sm"
            variant="bordered"
            classNames={{
              trigger: 'border-warm-gray/30 hover:border-terracotta/50',
              value: 'text-charcoal',
            }}
            aria-label={t('settings.language')}
          >
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value}>
                {t(lang.labelKey as Parameters<typeof t>[0])}
              </SelectItem>
            ))}
          </Select>
        </SettingSection>

        <Divider className="bg-warm-gray/10" />

        {/* Theme Setting */}
        <SettingSection
          icon={Palette}
          title={t('settings.theme')}
          description={t('settings.themeDescription')}
        >
          <Select
            selectedKeys={new Set([theme])}
            onSelectionChange={handleThemeChange}
            className="w-40"
            size="sm"
            variant="bordered"
            classNames={{
              trigger: 'border-warm-gray/30 hover:border-terracotta/50',
              value: 'text-charcoal',
            }}
            aria-label={t('settings.theme')}
          >
            {THEMES.map((themeOption) => (
              <SelectItem key={themeOption.value}>
                {t(themeOption.labelKey as Parameters<typeof t>[0])}
              </SelectItem>
            ))}
          </Select>
        </SettingSection>

        <Divider className="bg-warm-gray/10" />

        {/* Notification Settings */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-terracotta/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
              <Bell className="text-terracotta h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-charcoal font-medium">{t('settings.notifications')}</span>
              <span className="text-charcoal/60 text-sm">
                {t('settings.notificationsDescription')}
              </span>
            </div>
          </div>

          <div className="ml-13 space-y-1 pl-13">
            <NotificationToggle
              label={t('settings.emailNotifications')}
              checked={notifications.email ?? true}
              onChange={(value) => handleNotificationChange('email', value)}
              isDisabled={isLoadingSettings}
            />
            <NotificationToggle
              label={t('settings.pushNotifications')}
              checked={notifications.push ?? false}
              onChange={(value) => handleNotificationChange('push', value)}
              isDisabled={isLoadingSettings}
            />
          </div>
        </div>

        <Divider className="bg-warm-gray/10" />

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            color="primary"
            variant="solid"
            isLoading={isLoadingSettings}
            onPress={handleSave}
            startContent={!isLoadingSettings && <Check className="h-4 w-4" />}
            className="bg-terracotta hover:bg-terracotta/90 text-white"
          >
            {t('settings.save')}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ============================================================
// Main Component
// ============================================================

export function SettingsForm({ onUpdate }: SettingsFormProps) {
  const { settings, isLoadingSettings, updateSettings } = useUserStore();

  if (!settings) {
    return null;
  }

  // Use settings.id as key to reset form state when settings are reloaded
  return (
    <SettingsFormInner
      key={settings.id}
      settings={settings}
      isLoadingSettings={isLoadingSettings}
      updateSettings={updateSettings}
      onUpdate={onUpdate}
    />
  );
}
