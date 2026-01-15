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

// Gemini API configuration
export const geminiConfig = {
  model: 'gemini-3-flash-preview' as const,
  timeouts: {
    analysis: 20000, // 20 seconds
    tts: 20000, // 20 seconds
  },
  voices: {
    'zh-TW': 'Puck',
    en: 'Aoede',
  } as const,
} as const;

// Type for appConfig
export type AppConfig = typeof appConfig;
export type GeminiConfig = typeof geminiConfig;
