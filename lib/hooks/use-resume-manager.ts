'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ResumeData, ResumeContent } from '@/lib/resume/types';
import { apiClient } from '@/lib/utils/api-client';

// ============================================================
// Types
// ============================================================

export interface UseResumeManagerOptions {
  /**
   * Callback triggered when resume content changes.
   * Used to sync resume content with external stores (e.g., interview store).
   */
  onContentChange?: (content: ResumeContent | null) => void;
}

export interface UseResumeManagerReturn {
  /** Current resume data */
  resume: ResumeData | null;
  /** Whether resume is being loaded */
  isLoadingResume: boolean;
  /** Whether resume is being deleted */
  isDeletingResume: boolean;
  /** Whether the preview modal is open */
  isPreviewOpen: boolean;
  /** Whether in replace mode (showing upload form instead of card) */
  isReplacing: boolean;
  /** Handler for successful resume upload */
  handleResumeUploadSuccess: (data: ResumeData) => void;
  /** Handler to open preview modal */
  handleResumePreview: () => void;
  /** Handler to enter replace mode */
  handleResumeReplace: () => void;
  /** Handler to delete resume */
  handleResumeDelete: () => Promise<void>;
  /** Handler to cancel replace mode */
  handleCancelReplace: () => void;
  /** Handler to close preview modal */
  handleClosePreview: () => void;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * Custom hook for managing resume state and operations.
 * Extracts common resume management logic from ProfileForm and InterviewSetupPage.
 *
 * @param options - Configuration options for the hook
 * @returns Resume state and handler functions
 *
 * @example
 * // Basic usage in ProfileForm
 * const {
 *   resume,
 *   isLoadingResume,
 *   handleResumeUploadSuccess,
 *   handleResumeDelete,
 * } = useResumeManager();
 *
 * @example
 * // Usage with content sync in InterviewSetupPage
 * const setResumeContent = useInterviewStore((state) => state.setResumeContent);
 * const {
 *   resume,
 *   isLoadingResume,
 *   handleResumeUploadSuccess,
 * } = useResumeManager({
 *   onContentChange: setResumeContent,
 * });
 */
export function useResumeManager(options?: UseResumeManagerOptions): UseResumeManagerReturn {
  const { onContentChange } = options ?? {};

  // Resume state
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [isDeletingResume, setIsDeletingResume] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  // Fetch user's resume on mount
  useEffect(() => {
    async function fetchResume() {
      try {
        // apiClient handles response unwrapping and error conversion
        const data = await apiClient.get<ResumeData | null>('/api/resume');
        if (data) {
          setResume(data);
          // Notify parent if callback is provided
          onContentChange?.(data.content);
        }
      } catch {
        // User might not have a resume or not logged in, which is fine
      } finally {
        setIsLoadingResume(false);
      }
    }

    fetchResume();
    // Intentionally omit onContentChange from deps to prevent re-fetching
    // when callback reference changes. The initial fetch is sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle resume upload success
  const handleResumeUploadSuccess = useCallback(
    (data: ResumeData) => {
      setResume(data);
      setIsReplacing(false);
      // Notify parent if callback is provided
      onContentChange?.(data.content);
    },
    [onContentChange]
  );

  // Handle resume preview
  const handleResumePreview = useCallback(() => {
    setIsPreviewOpen(true);
  }, []);

  // Handle close preview
  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  // Handle resume replace
  const handleResumeReplace = useCallback(() => {
    setIsReplacing(true);
  }, []);

  // Handle resume delete
  const handleResumeDelete = useCallback(async () => {
    setIsDeletingResume(true);
    try {
      // apiClient handles response unwrapping
      await apiClient.delete('/api/resume');
      setResume(null);
      // Notify parent if callback is provided
      onContentChange?.(null);
    } catch {
      // Handle error silently (could add toast notification here in future)
    } finally {
      setIsDeletingResume(false);
    }
  }, [onContentChange]);

  // Handle cancel replace
  const handleCancelReplace = useCallback(() => {
    setIsReplacing(false);
  }, []);

  return {
    resume,
    isLoadingResume,
    isDeletingResume,
    isPreviewOpen,
    isReplacing,
    handleResumeUploadSuccess,
    handleResumePreview,
    handleResumeReplace,
    handleResumeDelete,
    handleCancelReplace,
    handleClosePreview,
  };
}
