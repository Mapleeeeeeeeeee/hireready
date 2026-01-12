'use client';

/**
 * Client-side environment configuration
 * Only NEXT_PUBLIC_ prefixed variables are available on the client
 *
 * Usage:
 * import { clientEnv } from '@/lib/config/client';
 *
 * SECURITY NOTE:
 * Sensitive API keys (like GEMINI_API_KEY) should NOT be exposed here.
 * Use server-side API routes to provide credentials to authenticated users.
 */

export const clientEnv = {
  // App URL (for client-side redirects, API calls, etc.)
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5555',
} as const;

// Type for clientEnv
export type ClientEnv = typeof clientEnv;
