/**
 * Centralized constants and enums for the application
 * All enum-like values should be defined here for consistency
 */

// ============================================================
// Interview Related
// ============================================================

/**
 * Valid interview statuses
 */
export const INTERVIEW_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

// ============================================================
// User Settings Related
// ============================================================

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = ['en', 'zh-TW'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * UI themes
 */
export const UI_THEMES = ['light', 'dark', 'system'] as const;
export type UITheme = (typeof UI_THEMES)[number];

// ============================================================
// Validation Constraints
// ============================================================

/**
 * Field length constraints
 */
export const FIELD_CONSTRAINTS = {
  name: { maxLength: 100 },
  email: { maxLength: 255 },
  feedback: { maxLength: 5000 },
  jobDescription: { maxLength: 10000 },
} as const;

// ============================================================
// Pagination Defaults
// ============================================================

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 10,
  maxLimit: 100,
  minLimit: 1,
} as const;

// ============================================================
// Default User Settings
// ============================================================

export const DEFAULT_USER_SETTINGS = {
  preferredLanguage: 'zh-TW' as SupportedLanguage,
  theme: 'light' as UITheme,
  notifications: {
    email: true,
    push: true,
    interviewReminders: true,
    weeklyReport: false,
  },
} as const;

// ============================================================
// Status Color Mappings
// ============================================================

/**
 * HeroUI color variants for interview status
 * Used in StatusChip component
 */
export const STATUS_COLORS: Record<InterviewStatus, 'warning' | 'primary' | 'success'> = {
  pending: 'warning',
  in_progress: 'primary',
  completed: 'success',
} as const;

/**
 * Tailwind accent background colors for interview status
 * Used in InterviewCard left accent bar
 */
export const STATUS_ACCENT_COLORS: Record<InterviewStatus, string> = {
  pending: 'bg-warning',
  in_progress: 'bg-primary',
  completed: 'bg-success',
} as const;
