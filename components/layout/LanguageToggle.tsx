'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button, ButtonGroup } from '@heroui/react';

// ============================================================
// Types
// ============================================================

export interface LanguageToggleProps {
  /** Optional className for additional styling */
  className?: string;
}

// ============================================================
// Component
// ============================================================

export function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current locale from pathname
  const currentLocale = pathname.split('/')[1] || 'zh-TW';

  const handleLanguageChange = useCallback(
    (locale: 'en' | 'zh-TW') => {
      if (locale === currentLocale) return;

      // Replace locale in pathname
      const newPathname = pathname.replace(`/${currentLocale}`, `/${locale}`);
      router.push(newPathname);
    },
    [currentLocale, pathname, router]
  );

  return (
    <ButtonGroup className={className} size="sm">
      <Button
        variant={currentLocale === 'en' ? 'solid' : 'flat'}
        onPress={() => handleLanguageChange('en')}
        className={
          currentLocale === 'en'
            ? 'bg-terracotta text-white'
            : 'bg-warm-gray/10 text-charcoal/70 hover:bg-warm-gray/20'
        }
        aria-label="Switch to English"
      >
        EN
      </Button>
      <Button
        variant={currentLocale === 'zh-TW' ? 'solid' : 'flat'}
        onPress={() => handleLanguageChange('zh-TW')}
        className={
          currentLocale === 'zh-TW'
            ? 'bg-terracotta text-white'
            : 'bg-warm-gray/10 text-charcoal/70 hover:bg-warm-gray/20'
        }
        aria-label="切換至中文"
      >
        中
      </Button>
    </ButtonGroup>
  );
}
