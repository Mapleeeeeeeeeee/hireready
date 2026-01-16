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

// Gemini API configuration (non-live API settings)
// For Live API config, see lib/gemini/types.ts
export const geminiConfig = {
  model: 'gemini-3-flash-preview' as const,
  timeouts: {
    analysis: 90000, // 90 seconds
  },
} as const;

// Type for appConfig
export type AppConfig = typeof appConfig;
export type GeminiConfig = typeof geminiConfig;
