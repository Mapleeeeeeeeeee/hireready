/**
 * Format utility functions
 * Provides common formatting functions for the application
 */

/**
 * Formats a duration in seconds to MM:SS clock format
 *
 * @param seconds - The duration in seconds
 * @returns Formatted string in MM:SS clock format (e.g., "02:30", "12:05")
 *
 * @example
 * formatTimeDisplay(0)    // "00:00"
 * formatTimeDisplay(65)   // "01:05"
 * formatTimeDisplay(150)  // "02:30"
 * formatTimeDisplay(3661) // "61:01"
 */
export function formatTimeDisplay(seconds: number): string {
  // Handle negative values by treating them as zero
  const normalizedSeconds = Math.max(0, Math.floor(seconds));

  const mins = Math.floor(normalizedSeconds / 60);
  const secs = normalizedSeconds % 60;

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
