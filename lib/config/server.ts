/**
 * Server-side environment configuration
 * All server-only environment variables should be accessed through this module
 *
 * Usage:
 * import { serverEnv } from '@/lib/config/server';
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value) return value;
  if (defaultValue !== undefined) return defaultValue;

  // Only throw error at runtime when actually accessed
  return '';
}

function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const serverEnv = {
  // App
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: parseInt(getEnvVar('PORT', '5555'), 10),

  // Better Auth (lazy evaluation - will throw at runtime if not set)
  get betterAuthUrl() {
    return getRequiredEnvVar('BETTER_AUTH_URL');
  },
  get betterAuthSecret() {
    return getRequiredEnvVar('BETTER_AUTH_SECRET');
  },

  // Google OAuth (optional - set up later)
  googleClientId: getEnvVar('GOOGLE_CLIENT_ID', ''),
  googleClientSecret: getEnvVar('GOOGLE_CLIENT_SECRET', ''),

  // Gemini API (optional)
  geminiApiKey: getEnvVar('GEMINI_API_KEY', ''),

  // Database (lazy evaluation - will throw at runtime if not set)
  get databaseUrl() {
    return getRequiredEnvVar('DATABASE_URL');
  },
} as const;

// Type for serverEnv
export type ServerEnv = typeof serverEnv;
