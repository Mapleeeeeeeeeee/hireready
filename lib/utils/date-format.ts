/**
 * Date and time formatting utilities
 * Centralized date formatting functions to avoid duplication across components
 */

// ============================================================
// Types
// ============================================================

/**
 * Supported locale strings for date formatting
 */
export type DateFormatLocale = 'en' | 'zh-TW';

// ============================================================
// Date Formatting Functions
// ============================================================

/**
 * Format date string to localized date
 *
 * @param dateString - ISO date string to format
 * @param locale - Locale for formatting (defaults to 'en')
 * @param options - Optional Intl.DateTimeFormatOptions to customize output
 * @returns Formatted date string
 *
 * @example
 * formatDate('2024-01-15T10:30:00Z', 'en') // "Jan 15, 2024"
 * formatDate('2024-01-15T10:30:00Z', 'zh-TW') // "2024年1月15日"
 */
export function formatDate(
  dateString: string,
  locale: DateFormatLocale = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return date.toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', options ?? defaultOptions);
}

/**
 * Format date string to localized long format (full month name)
 *
 * @param dateString - ISO date string to format
 * @param locale - Locale for formatting (defaults to 'en')
 * @returns Formatted date string with full month name
 *
 * @example
 * formatDateLong('2024-01-15T10:30:00Z', 'en') // "January 15, 2024"
 * formatDateLong('2024-01-15T10:30:00Z', 'zh-TW') // "2024年1月15日"
 */
export function formatDateLong(dateString: string, locale: DateFormatLocale = 'en'): string {
  return formatDate(dateString, locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================
// Duration Formatting Functions
// ============================================================

/**
 * Format duration from seconds to human readable string
 *
 * @param seconds - Duration in seconds
 * @returns Human readable duration string (e.g., "5m 30s")
 *
 * @example
 * formatDuration(90) // "1m 30s"
 * formatDuration(60) // "1m"
 * formatDuration(45) // "45s"
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format timestamp from milliseconds to MM:SS format
 *
 * @param ms - Timestamp in milliseconds
 * @returns Formatted timestamp string in MM:SS format
 *
 * @example
 * formatTimestamp(90000) // "01:30"
 * formatTimestamp(3600000) // "60:00"
 */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
