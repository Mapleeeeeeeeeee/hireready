/**
 * Resume API Route
 * GET /api/resume - Get user's resume data
 * DELETE /api/resume - Delete user's resume
 */

import { withAuthHandler } from '@/lib/utils/api-response';
import { getResume, deleteResume } from '@/lib/resume/resume-service';
import type { ResumeData } from '@/lib/resume/types';

// ============================================================
// Types
// ============================================================

interface ResumeResponse {
  url: string;
  fileName: string;
  content: ResumeData['content'];
  taskId: string | null;
  updatedAt: string;
}

interface DeleteResumeResponse {
  deleted: boolean;
}

// ============================================================
// GET Handler - Get Resume Data
// ============================================================

async function handleGetResume(_request: Request, userId: string): Promise<ResumeResponse | null> {
  const resume = await getResume(userId);

  if (!resume) {
    return null;
  }

  return {
    url: resume.url,
    fileName: resume.fileName,
    content: resume.content,
    taskId: resume.taskId,
    updatedAt: resume.updatedAt.toISOString(),
  };
}

// ============================================================
// DELETE Handler - Delete Resume
// ============================================================

async function handleDeleteResume(
  _request: Request,
  userId: string
): Promise<DeleteResumeResponse> {
  await deleteResume(userId);

  return {
    deleted: true,
  };
}

export const GET = withAuthHandler(handleGetResume, {
  module: 'api-resume',
  action: 'get',
});

export const DELETE = withAuthHandler(handleDeleteResume, {
  module: 'api-resume',
  action: 'delete',
});
