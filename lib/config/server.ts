'use server';

/**
 * Server-side environment configuration
 * All server-only environment variables should be accessed through this module
 *
 * Usage:
 * import { serverEnv } from '@/lib/config/server';
 */

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? '';
}

export const serverEnv = {
  // App
  nodeEnv: getEnvVar('NODE_ENV', false) || 'development',
  port: parseInt(getEnvVar('PORT', false) || '5555', 10),

  // Better Auth
  betterAuthUrl: getEnvVar('BETTER_AUTH_URL'),
  betterAuthSecret: getEnvVar('BETTER_AUTH_SECRET'),

  // Google OAuth
  googleClientId: getEnvVar('GOOGLE_CLIENT_ID'),
  googleClientSecret: getEnvVar('GOOGLE_CLIENT_SECRET'),

  // Gemini API
  geminiApiKey: getEnvVar('GEMINI_API_KEY'),

  // Database
  databaseUrl: getEnvVar('DATABASE_URL'),
} as const;

// Type for serverEnv
export type ServerEnv = typeof serverEnv;
