/**
 * Shared configuration (can be used on both client and server)
 * Only non-sensitive, static configuration should go here
 */

export const appConfig = {
  name: 'HireReady',
  description: 'AI 驅動的語音面試模擬平台',
  defaultLocale: 'zh-TW' as const,
  locales: ['zh-TW', 'en'] as const,
} as const;

// Type for appConfig
export type AppConfig = typeof appConfig;
