/**
 * Centralized user-related type definitions
 * Used across API routes and stores for consistency
 */

import type { ModelAnswer } from '@/lib/types/interview';

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
 * Job description data stored with interview
 */
export interface JobDescriptionData {
  source?: string;
  url?: string;
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  requirements?: string[];
}

/**
 * Interview list item from API (paginated list)
 */
export interface InterviewListItem {
  id: string;
  status: string;
  score: number | null;
  duration: number | null;
  feedback: string | null;
  strengths: string[];
  improvements: string[];
  jobDescriptionUrl: string | null;
  jobDescription: JobDescriptionData | null;
  modelAnswer: ModelAnswer | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Recent interview data for stats (subset of full interview)
 */
export interface RecentInterview {
  id: string;
  status: string;
  score: number | null;
  duration: number | null;
  createdAt: string;
}
