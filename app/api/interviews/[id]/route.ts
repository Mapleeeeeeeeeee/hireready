/**
 * Interview Detail API Route
 * GET /api/interviews/[id] - Get interview details
 * DELETE /api/interviews/[id] - Delete interview
 */

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { BadRequestError } from '@/lib/utils/errors';
import { verifyOwnership } from '@/lib/utils/resource-helpers';

// ============================================================
// Types
// ============================================================

interface InterviewDetailResponse {
  id: string;
  scenario: string;
  status: string;
  score: number | null;
  duration: number | null;
  feedback: string | null;
  transcript: unknown;
  strengths: string[];
  improvements: string[];
  createdAt: string;
  updatedAt: string;
}

interface DeleteInterviewResponse {
  id: string;
  deleted: boolean;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Extract interview ID from URL path
 * URL format: /api/interviews/[id]
 */
function extractInterviewId(url: string): string {
  const urlObj = new URL(url);
  const pathSegments = urlObj.pathname.split('/').filter(Boolean);
  // Path: api/interviews/[id]
  const id = pathSegments[2];
  if (!id) {
    throw new BadRequestError('Interview ID is required');
  }
  return id;
}

// ============================================================
// GET Handler - Get Interview Details
// ============================================================

async function handleGetInterview(
  request: Request,
  userId: string
): Promise<InterviewDetailResponse> {
  const id = extractInterviewId(request.url);

  // Fetch interview
  const rawInterview = await prisma.interview.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      scenario: true,
      status: true,
      score: true,
      duration: true,
      feedback: true,
      transcript: true,
      strengths: true,
      improvements: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Verify existence and ownership
  const interview = verifyOwnership(rawInterview, userId, 'Interview');

  return {
    id: interview.id,
    scenario: interview.scenario,
    status: interview.status,
    score: interview.score,
    duration: interview.duration,
    feedback: interview.feedback,
    transcript: interview.transcript,
    strengths: interview.strengths,
    improvements: interview.improvements,
    createdAt: interview.createdAt.toISOString(),
    updatedAt: interview.updatedAt.toISOString(),
  };
}

// ============================================================
// DELETE Handler - Delete Interview
// ============================================================

async function handleDeleteInterview(
  request: Request,
  userId: string
): Promise<DeleteInterviewResponse> {
  const id = extractInterviewId(request.url);

  // Fetch interview to verify ownership
  const rawInterview = await prisma.interview.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  // Verify existence and ownership
  verifyOwnership(rawInterview, userId, 'Interview');

  // Delete the interview
  await prisma.interview.delete({
    where: { id },
  });

  return {
    id,
    deleted: true,
  };
}

export const GET = withAuthHandler(handleGetInterview, {
  module: 'api-interviews',
  action: 'get-detail',
});

export const DELETE = withAuthHandler(handleDeleteInterview, {
  module: 'api-interviews',
  action: 'delete',
});
