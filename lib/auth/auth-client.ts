'use client';

import { createAuthClient } from 'better-auth/react';
import { clientEnv } from '@/lib/config/client';

export const authClient = createAuthClient({
  baseURL: clientEnv.appUrl,
});

// Export hooks for convenience
export const { useSession } = authClient;
export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
