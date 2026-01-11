import { describe, expect, it } from 'vitest';
import { appConfig } from '@/lib/config';

describe('appConfig', () => {
  it('should have correct app name', () => {
    expect(appConfig.name).toBe('HireReady');
  });

  it('should have supported locales', () => {
    expect(appConfig.locales).toContain('zh-TW');
    expect(appConfig.locales).toContain('en');
  });

  it('should have default locale as zh-TW', () => {
    expect(appConfig.defaultLocale).toBe('zh-TW');
  });
});
