/**
 * Error i18n utilities
 * Provides localized error messages based on error codes
 */

'use client';

import { useTranslations } from 'next-intl';
import type { AppError, ErrorCode } from './errors';
import { isAppError } from './errors';

// ============================================================
// Hook for Error Translation
// ============================================================

/**
 * Hook to get localized error message from AppError
 *
 * @example
 * ```tsx
 * function Component() {
 *   const getErrorMessage = useErrorMessage();
 *
 *   try {
 *     await apiGet('/api/endpoint');
 *   } catch (error) {
 *     const message = getErrorMessage(error);
 *     toast.error(message);
 *   }
 * }
 * ```
 */
export function useErrorMessage() {
  const t = useTranslations('errors');

  return (error: unknown): string => {
    // Handle AppError with i18n key
    if (isAppError(error)) {
      return getLocalizedMessage(error.code, error.message, t);
    }

    // Handle generic Error
    if (error instanceof Error) {
      return error.message;
    }

    // Fallback for unknown errors
    return t('UNKNOWN_ERROR');
  };
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Get localized error message
 * Falls back to original message if i18n key not found
 */
function getLocalizedMessage(
  code: ErrorCode,
  originalMessage: string,
  t: (key: string) => string
): string {
  try {
    // Try to get i18n message
    const localizedMessage = t(code);

    // If i18n key exists and is different from code, use it
    if (localizedMessage && localizedMessage !== code) {
      return localizedMessage;
    }

    // Fallback to original message
    return originalMessage;
  } catch {
    // If translation fails, use original message
    return originalMessage;
  }
}

/**
 * Format error with context (for debugging)
 */
export function formatErrorWithContext(error: AppError): string {
  const parts = [error.message];

  if (error.context) {
    const contextStr = Object.entries(error.context)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(', ');
    parts.push(`(${contextStr})`);
  }

  return parts.join(' ');
}
