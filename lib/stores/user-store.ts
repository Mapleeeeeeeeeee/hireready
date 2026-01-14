/**
 * User state management using Zustand
 * Manages user profile, settings, statistics, and interview history
 */

'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { logger } from '@/lib/utils/logger';
import { apiClient } from '@/lib/utils/api-client';
import { toAppError, type AppError } from '@/lib/utils/errors';
import { PAGINATION_DEFAULTS } from '@/lib/constants/enums';
import type { NotificationSettings, InterviewListItem, RecentInterview } from '@/lib/types/user';

// Re-export types for backward compatibility
export type { NotificationSettings, InterviewListItem, RecentInterview };

// ============================================================
// Types
// ============================================================

/**
 * User profile data from API
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User settings from API
 */
export interface UserSettings {
  id: string;
  preferredLanguage: string;
  theme: string;
  notifications: NotificationSettings | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for updating user settings
 */
export interface UserSettingsInput {
  preferredLanguage?: string;
  theme?: string;
  notifications?: NotificationSettings;
}

/**
 * User statistics from API
 */
export interface UserStats {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number | null;
  totalPracticeMinutes: number;
  recentInterviews: RecentInterview[];
}

/**
 * Interview detail from API
 */
export interface InterviewDetail extends InterviewListItem {
  transcript: unknown;
}

/**
 * Paginated interviews response from API
 */
export interface InterviewsListResponse {
  interviews: InterviewListItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Query parameters for fetching interviews
 */
export interface InterviewsQueryParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

/**
 * Delete interview response
 */
export interface DeleteInterviewResponse {
  id: string;
  deleted: boolean;
}

/**
 * User store state
 */
export interface UserStoreState {
  // User data
  profile: UserProfile | null;
  settings: UserSettings | null;
  stats: UserStats | null;

  // Interview history
  interviews: InterviewListItem[];
  interviewsTotal: number;
  interviewsPage: number;
  interviewsLimit: number;
  selectedInterview: InterviewDetail | null;

  // Loading states
  isLoadingProfile: boolean;
  isLoadingSettings: boolean;
  isLoadingStats: boolean;
  isLoadingInterviews: boolean;
  isLoadingInterviewDetail: boolean;
  isDeletingInterview: boolean;

  // Error state
  error: AppError | null;
}

/**
 * User store actions
 */
export interface UserStoreActions {
  // Profile actions
  fetchProfile: () => Promise<void>;
  updateProfile: (data: { name?: string }) => Promise<void>;

  // Settings actions
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<UserSettingsInput>) => Promise<void>;

  // Stats actions
  fetchStats: () => Promise<void>;

  // Interview history actions
  fetchInterviews: (params?: InterviewsQueryParams) => Promise<void>;
  fetchInterviewById: (id: string) => Promise<void>;
  deleteInterview: (id: string) => Promise<boolean>;
  clearSelectedInterview: () => void;

  // Error actions
  setError: (error: AppError | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

export type UserStore = UserStoreState & UserStoreActions;

// ============================================================
// Initial State
// ============================================================

const initialState: UserStoreState = {
  // User data
  profile: null,
  settings: null,
  stats: null,

  // Interview history
  interviews: [],
  interviewsTotal: 0,
  interviewsPage: PAGINATION_DEFAULTS.page,
  interviewsLimit: PAGINATION_DEFAULTS.limit,
  selectedInterview: null,

  // Loading states
  isLoadingProfile: false,
  isLoadingSettings: false,
  isLoadingStats: false,
  isLoadingInterviews: false,
  isLoadingInterviewDetail: false,
  isDeletingInterview: false,

  // Error state
  error: null,
};

// ============================================================
// Auth Error Helper
// ============================================================

/**
 * Handle authentication errors by clearing user data
 * @returns true if auth error was handled, false otherwise
 */
function handleAuthError(
  appError: AppError,
  action: string,
  set: (state: Partial<UserStoreState>) => void
): boolean {
  if (appError.code === 'UNAUTHORIZED' || appError.code === 'FORBIDDEN') {
    logger.warn('Authentication error, clearing user data', {
      module: 'user-store',
      action,
      code: appError.code,
    });
    set(initialState);
    return true;
  }
  return false;
}

// ============================================================
// Store
// ============================================================

export const useUserStore = create<UserStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Profile actions
      fetchProfile: async () => {
        const currentState = get();
        if (currentState.isLoadingProfile) {
          logger.debug('Profile fetch already in progress, skipping', {
            module: 'user-store',
            action: 'fetchProfile',
          });
          return;
        }

        set({ isLoadingProfile: true, error: null });

        try {
          logger.debug('Fetching user profile', {
            module: 'user-store',
            action: 'fetchProfile',
          });

          const profile = await apiClient.get<UserProfile>('/api/user/profile');

          logger.info('User profile fetched successfully', {
            module: 'user-store',
            action: 'fetchProfile',
            userId: profile.id,
          });

          set({ profile, isLoadingProfile: false });
        } catch (error) {
          const appError = toAppError(error);
          if (handleAuthError(appError, 'fetchProfile', set)) return;

          logger.error('Failed to fetch user profile', appError, {
            module: 'user-store',
            action: 'fetchProfile',
            code: appError.code,
          });
          set({ error: appError, isLoadingProfile: false });
        }
      },

      updateProfile: async (data) => {
        const currentState = get();
        if (currentState.isLoadingProfile) {
          logger.debug('Profile update already in progress, skipping', {
            module: 'user-store',
            action: 'updateProfile',
          });
          return;
        }

        set({ isLoadingProfile: true, error: null });

        try {
          logger.debug('Updating user profile', {
            module: 'user-store',
            action: 'updateProfile',
            hasName: data.name !== undefined,
          });

          const profile = await apiClient.put<UserProfile>('/api/user/profile', data);

          logger.info('User profile updated successfully', {
            module: 'user-store',
            action: 'updateProfile',
            userId: profile.id,
          });

          set({ profile, isLoadingProfile: false });
        } catch (error) {
          const appError = toAppError(error);
          if (handleAuthError(appError, 'updateProfile', set)) return;

          logger.error('Failed to update user profile', appError, {
            module: 'user-store',
            action: 'updateProfile',
            code: appError.code,
          });
          set({ error: appError, isLoadingProfile: false });
        }
      },

      // Settings actions
      fetchSettings: async () => {
        const currentState = get();
        if (currentState.isLoadingSettings) {
          logger.debug('Settings fetch already in progress, skipping', {
            module: 'user-store',
            action: 'fetchSettings',
          });
          return;
        }

        set({ isLoadingSettings: true, error: null });

        try {
          logger.debug('Fetching user settings', {
            module: 'user-store',
            action: 'fetchSettings',
          });

          const settings = await apiClient.get<UserSettings>('/api/user/settings');

          logger.info('User settings fetched successfully', {
            module: 'user-store',
            action: 'fetchSettings',
            settingsId: settings.id,
          });

          set({ settings, isLoadingSettings: false });
        } catch (error) {
          const appError = toAppError(error);
          if (handleAuthError(appError, 'fetchSettings', set)) return;

          logger.error('Failed to fetch user settings', appError, {
            module: 'user-store',
            action: 'fetchSettings',
            code: appError.code,
          });
          set({ error: appError, isLoadingSettings: false });
        }
      },

      updateSettings: async (data) => {
        const currentState = get();
        if (currentState.isLoadingSettings) {
          logger.debug('Settings update already in progress, skipping', {
            module: 'user-store',
            action: 'updateSettings',
          });
          return;
        }

        set({ isLoadingSettings: true, error: null });

        try {
          logger.debug('Updating user settings', {
            module: 'user-store',
            action: 'updateSettings',
            fields: Object.keys(data),
          });

          const settings = await apiClient.put<UserSettings>('/api/user/settings', data);

          logger.info('User settings updated successfully', {
            module: 'user-store',
            action: 'updateSettings',
            settingsId: settings.id,
          });

          set({ settings, isLoadingSettings: false });
        } catch (error) {
          const appError = toAppError(error);
          if (handleAuthError(appError, 'updateSettings', set)) return;

          logger.error('Failed to update user settings', appError, {
            module: 'user-store',
            action: 'updateSettings',
            code: appError.code,
          });
          set({ error: appError, isLoadingSettings: false });
        }
      },

      // Stats actions
      fetchStats: async () => {
        const currentState = get();
        if (currentState.isLoadingStats) {
          logger.debug('Stats fetch already in progress, skipping', {
            module: 'user-store',
            action: 'fetchStats',
          });
          return;
        }

        set({ isLoadingStats: true, error: null });

        try {
          logger.debug('Fetching user stats', {
            module: 'user-store',
            action: 'fetchStats',
          });

          const stats = await apiClient.get<UserStats>('/api/user/stats');

          logger.info('User stats fetched successfully', {
            module: 'user-store',
            action: 'fetchStats',
            totalInterviews: stats.totalInterviews,
            completedInterviews: stats.completedInterviews,
          });

          set({ stats, isLoadingStats: false });
        } catch (error) {
          const appError = toAppError(error);
          if (handleAuthError(appError, 'fetchStats', set)) return;

          logger.error('Failed to fetch user stats', appError, {
            module: 'user-store',
            action: 'fetchStats',
            code: appError.code,
          });
          set({ error: appError, isLoadingStats: false });
        }
      },

      // Interview history actions
      fetchInterviews: async (params?: InterviewsQueryParams) => {
        const currentState = get();
        if (currentState.isLoadingInterviews) {
          logger.debug('Interviews fetch already in progress, skipping', {
            module: 'user-store',
            action: 'fetchInterviews',
          });
          return;
        }

        set({ isLoadingInterviews: true, error: null });

        try {
          // Build query string
          const queryParams = new URLSearchParams();
          if (params?.page) queryParams.set('page', params.page.toString());
          if (params?.limit) queryParams.set('limit', params.limit.toString());
          if (params?.status) queryParams.set('status', params.status);

          const queryString = queryParams.toString();
          const url = `/api/interviews${queryString ? `?${queryString}` : ''}`;

          logger.debug('Fetching interviews', {
            module: 'user-store',
            action: 'fetchInterviews',
            params,
          });

          const response = await apiClient.get<InterviewsListResponse>(url);

          logger.info('Interviews fetched successfully', {
            module: 'user-store',
            action: 'fetchInterviews',
            total: response.total,
            page: response.page,
            count: response.interviews.length,
          });

          set({
            interviews: response.interviews,
            interviewsTotal: response.total,
            interviewsPage: response.page,
            interviewsLimit: response.limit,
            isLoadingInterviews: false,
          });
        } catch (error) {
          const appError = toAppError(error);
          if (handleAuthError(appError, 'fetchInterviews', set)) return;

          logger.error('Failed to fetch interviews', appError, {
            module: 'user-store',
            action: 'fetchInterviews',
            code: appError.code,
          });
          set({ error: appError, isLoadingInterviews: false });
        }
      },

      fetchInterviewById: async (id: string) => {
        const currentState = get();
        if (currentState.isLoadingInterviewDetail) {
          logger.debug('Interview detail fetch already in progress, skipping', {
            module: 'user-store',
            action: 'fetchInterviewById',
          });
          return;
        }

        set({ isLoadingInterviewDetail: true, error: null, selectedInterview: null });

        try {
          logger.debug('Fetching interview detail', {
            module: 'user-store',
            action: 'fetchInterviewById',
            interviewId: id,
          });

          const interview = await apiClient.get<InterviewDetail>(`/api/interviews/${id}`);

          logger.info('Interview detail fetched successfully', {
            module: 'user-store',
            action: 'fetchInterviewById',
            interviewId: interview.id,
            status: interview.status,
          });

          set({ selectedInterview: interview, isLoadingInterviewDetail: false });
        } catch (error) {
          const appError = toAppError(error);
          if (handleAuthError(appError, 'fetchInterviewById', set)) return;

          logger.error('Failed to fetch interview detail', appError, {
            module: 'user-store',
            action: 'fetchInterviewById',
            code: appError.code,
            interviewId: id,
          });
          set({ error: appError, isLoadingInterviewDetail: false });
        }
      },

      deleteInterview: async (id: string) => {
        const currentState = get();
        if (currentState.isDeletingInterview) {
          logger.debug('Interview deletion already in progress, skipping', {
            module: 'user-store',
            action: 'deleteInterview',
          });
          return false;
        }

        set({ isDeletingInterview: true, error: null });

        try {
          logger.debug('Deleting interview', {
            module: 'user-store',
            action: 'deleteInterview',
            interviewId: id,
          });

          const response = await apiClient.delete<DeleteInterviewResponse>(`/api/interviews/${id}`);

          logger.info('Interview deleted successfully', {
            module: 'user-store',
            action: 'deleteInterview',
            interviewId: response.id,
          });

          // Remove from local state
          const updatedInterviews = currentState.interviews.filter((i) => i.id !== id);

          // Clear selected interview if it's the deleted one
          const selectedInterview =
            currentState.selectedInterview?.id === id ? null : currentState.selectedInterview;

          set({
            interviews: updatedInterviews,
            interviewsTotal: Math.max(0, currentState.interviewsTotal - 1),
            selectedInterview,
            isDeletingInterview: false,
          });

          return true;
        } catch (error) {
          const appError = toAppError(error);
          if (handleAuthError(appError, 'deleteInterview', set)) return false;

          logger.error('Failed to delete interview', appError, {
            module: 'user-store',
            action: 'deleteInterview',
            code: appError.code,
            interviewId: id,
          });
          set({ error: appError, isDeletingInterview: false });
          return false;
        }
      },

      clearSelectedInterview: () => {
        set({ selectedInterview: null });
      },

      // Error actions
      setError: (error) => {
        if (error) {
          logger.error('User store error set', error, {
            module: 'user-store',
            action: 'setError',
            code: error.code,
          });
        }
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Reset
      reset: () => {
        logger.info('User store reset', {
          module: 'user-store',
          action: 'reset',
        });
        set(initialState);
      },
    }),
    { name: 'user-store' }
  )
);

// ============================================================
// Selectors
// ============================================================

/**
 * Select completion rate (percentage of completed interviews)
 * This selector has computation logic, so it's worth keeping as a reusable function
 */
export const selectCompletionRate = (state: UserStore): number | null => {
  if (!state.stats || state.stats.totalInterviews === 0) return null;
  return Math.round((state.stats.completedInterviews / state.stats.totalInterviews) * 100);
};

/**
 * Select total pages for interview pagination
 */
export const selectTotalPages = (state: UserStore): number => {
  if (state.interviewsTotal === 0 || state.interviewsLimit === 0) return 0;
  return Math.ceil(state.interviewsTotal / state.interviewsLimit);
};

/**
 * Select if there are more pages to load
 */
export const selectHasNextPage = (state: UserStore): boolean => {
  const totalPages = selectTotalPages(state);
  return state.interviewsPage < totalPages;
};

/**
 * Select if there are previous pages
 */
export const selectHasPreviousPage = (state: UserStore): boolean => {
  return state.interviewsPage > 1;
};

/**
 * Select if any data is currently loading
 */
export const selectIsLoading = (state: UserStore): boolean => {
  return (
    state.isLoadingProfile ||
    state.isLoadingSettings ||
    state.isLoadingStats ||
    state.isLoadingInterviews ||
    state.isLoadingInterviewDetail ||
    state.isDeletingInterview
  );
};

/**
 * Select interviews filtered by status
 */
export const selectInterviewsByStatus = (
  state: UserStore,
  status: 'pending' | 'in_progress' | 'completed'
): InterviewListItem[] => {
  return state.interviews.filter((interview) => interview.status === status);
};

/**
 * Select completed interviews count from current page
 */
export const selectCompletedInterviewsCount = (state: UserStore): number => {
  return state.interviews.filter((interview) => interview.status === 'completed').length;
};
