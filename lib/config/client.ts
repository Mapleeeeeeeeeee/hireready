'use client';

/**
 * Client-side environment configuration
 * Only NEXT_PUBLIC_ prefixed variables are available on the client
 *
 * Usage:
 * import { clientEnv } from '@/lib/config/client';
 */

export const clientEnv = {
  // App URL (for client-side redirects, API calls, etc.)
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5555',
} as const;

// Type for clientEnv
export type ClientEnv = typeof clientEnv;
