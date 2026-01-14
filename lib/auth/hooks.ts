'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { signIn } from '@/lib/auth/auth-client';
import { saveRedirectUrl, isValidRedirectUrl } from '@/lib/auth/utils';

/**
 * Hook for handling Google OAuth login with redirect URL management.
 * Centralizes login logic to avoid duplication across components.
 */
export function useGoogleLogin() {
  const pathname = usePathname();

  const handleLogin = useCallback(async () => {
    const safePathname = isValidRedirectUrl(pathname) ? pathname : '/';
    saveRedirectUrl(safePathname);
    await signIn.social({
      provider: 'google',
      callbackURL: safePathname,
    });
  }, [pathname]);

  return handleLogin;
}
