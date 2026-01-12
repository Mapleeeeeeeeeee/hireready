'use client';

const REDIRECT_KEY = 'auth_redirect_url';

export function saveRedirectUrl(url: string): void {
  if (typeof window === 'undefined') return;

  // Only save if it's a valid relative URL or same-origin
  if (isValidRedirectUrl(url)) {
    sessionStorage.setItem(REDIRECT_KEY, url);
  }
}

export function getRedirectUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(REDIRECT_KEY);
}

export function clearRedirectUrl(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(REDIRECT_KEY);
}

export function isValidRedirectUrl(url: string): boolean {
  // Only allow relative URLs or same-origin URLs
  try {
    // Relative URLs
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true;
    }

    // Same-origin URLs
    const urlObj = new URL(url);
    return urlObj.origin === window.location.origin;
  } catch {
    return false;
  }
}
