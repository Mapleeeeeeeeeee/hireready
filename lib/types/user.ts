/**
 * Centralized user-related type definitions
 * Used across API routes and stores for consistency
 */

// ============================================================
// Notification Settings
// ============================================================

/**
 * Notification settings for user preferences
 */
export interface NotificationSettings {
  email?: boolean;
  push?: boolean;
  interviewReminders?: boolean;
  weeklyReport?: boolean;
}

/**
 * Notification settings with index signature for Prisma JSON compatibility
 */
export interface NotificationSettingsJson extends NotificationSettings {
  [key: string]: boolean | undefined;
}

// ============================================================
// Interview Types
// ============================================================

/**
 * Interview list item from API (paginated list)
 */
export interface InterviewListItem {
  id: string;
  scenario: string;
  status: string;
  score: number | null;
  duration: number | null;
  feedback: string | null;
  strengths: string[];
  improvements: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Recent interview data for stats (subset of full interview)
 */
export interface RecentInterview {
  id: string;
  scenario: string;
  status: string;
  score: number | null;
  duration: number | null;
  createdAt: string;
}
