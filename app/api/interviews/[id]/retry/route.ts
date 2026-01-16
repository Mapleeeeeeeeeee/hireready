/**
 * Interview Retry Analysis API Route
 * POST /api/interviews/[id]/retry - Retry failed analysis
 */

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { verifyOwnership, extractResourceId } from '@/lib/utils/resource-helpers';
import { BadRequestError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import { isRedisAvailable } from '@/lib/queue/connection';
import { getInterviewAnalysisQueue } from '@/lib/queue/queues';
import type { TranscriptEntry } from '@/lib/gemini/types';

// ============================================================
// Types
// ============================================================

interface RetryAnalysisResponse {
  id: string;
  taskId: string;
  message: string;
}

// ============================================================
// POST Handler - Retry Interview Analysis
// ============================================================

async function handleRetryAnalysis(
  request: Request,
  userId: string
): Promise<RetryAnalysisResponse> {
  const id = extractResourceId(request.url, 'Interview');

  const logContext = {
    module: 'api-interviews',
    action: 'retry-analysis',
    interviewId: id,
    userId,
  };

  logger.info('Retrying interview analysis', logContext);

  // Check Redis availability
  if (!isRedisAvailable()) {
    throw new BadRequestError('Background job processing is not available');
  }

  // Fetch interview
  const rawInterview = await prisma.interview.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      score: true,
      transcript: true,
    },
  });

  // Verify existence and ownership
  const interview = verifyOwnership(rawInterview, userId, 'Interview');

  // Check if interview has transcript
  const transcripts = interview.transcript as TranscriptEntry[] | null;
  if (!transcripts || transcripts.length === 0) {
    throw new BadRequestError('Interview has no transcript to analyze');
  }

  // Check if analysis is already complete
  if (interview.score !== null) {
    throw new BadRequestError('Interview already has analysis results');
  }

  // Delete any existing failed tasks for this interview
  await prisma.backgroundTask.deleteMany({
    where: {
      resourceId: id,
      type: 'interview_analysis',
      status: 'failed',
    },
  });

  // Create new background task record
  const task = await prisma.backgroundTask.create({
    data: {
      userId,
      type: 'interview_analysis',
      status: 'pending',
      resourceId: id,
      progress: 0,
    },
  });

  // Push job to queue
  const queue = getInterviewAnalysisQueue();
  await queue.add(
    `analysis-${id}`,
    {
      taskId: task.id,
      userId,
      interviewId: id,
    },
    {
      jobId: `interview-analysis-${id}-retry-${Date.now()}`,
    }
  );

  logger.info('Interview analysis job queued for retry', {
    ...logContext,
    taskId: task.id,
    transcriptCount: transcripts.length,
  });

  return {
    id,
    taskId: task.id,
    message: 'Analysis job queued for retry',
  };
}

export const POST = withAuthHandler(handleRetryAnalysis, {
  module: 'api-interviews',
  action: 'retry-analysis',
});
