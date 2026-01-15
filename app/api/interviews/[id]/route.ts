/**
 * Interview Detail API Route
 * GET /api/interviews/[id] - Get interview details
 * DELETE /api/interviews/[id] - Delete interview
 */

import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { verifyOwnership, extractResourceId } from '@/lib/utils/resource-helpers';
import { logger } from '@/lib/utils/logger';

// ============================================================
// Types
// ============================================================

interface InterviewDetailResponse {
  id: string;
  scenario: string | null;
  status: string;
  score: number | null;
  duration: number | null;
  feedback: string | null;
  transcript: unknown;
  strengths: string[];
  improvements: string[];
  jobDescriptionUrl: string | null;
  modelAnswer: unknown;
  createdAt: string;
  updatedAt: string;
}

interface DeleteInterviewResponse {
  id: string;
  deleted: boolean;
}

// ============================================================
// GET Handler - Get Interview Details
// ============================================================

async function handleGetInterview(
  request: Request,
  userId: string
): Promise<InterviewDetailResponse> {
  const id = extractResourceId(request.url, 'Interview');

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
      jobDescriptionUrl: true,
      modelAnswer: true,
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
    jobDescriptionUrl: interview.jobDescriptionUrl,
    modelAnswer: interview.modelAnswer,
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
  const id = extractResourceId(request.url, 'Interview');

  // Fetch interview to verify ownership AND get modelAnswer path
  const rawInterview = await prisma.interview.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      modelAnswer: true, // Need this to get audio path
    },
  });

  const interview = verifyOwnership(rawInterview, userId, 'Interview');

  // Delete associated audio file if exists
  const modelAnswer = interview.modelAnswer as { audioUrl?: string } | null;
  if (modelAnswer?.audioUrl) {
    const audioPath = path.join(process.cwd(), 'public', modelAnswer.audioUrl);
    try {
      await fs.unlink(audioPath);
      logger.info('Deleted audio file', {
        module: 'api-interviews',
        action: 'delete',
        audioPath: modelAnswer.audioUrl,
      });
    } catch (error) {
      // Log but don't fail the deletion
      logger.warn('Failed to delete audio file', {
        module: 'api-interviews',
        action: 'delete',
        audioPath: modelAnswer.audioUrl,
        error: (error as Error).message,
      });
    }
  }

  // Delete the interview record
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
