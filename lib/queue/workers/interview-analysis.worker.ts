/**
 * Interview Analysis Worker
 * Processes interview analysis jobs from the queue
 */

import { Worker, type Job, type ConnectionOptions } from 'bullmq';

import { prisma } from '@/lib/db';
import { logger } from '@/lib/utils/logger';
import { analyzeInterview } from '@/lib/gemini/analysis-service';
import { getRedisConnection } from '../connection';
import { QUEUE_NAMES, type InterviewAnalysisJobData } from '../types';
import { updateTaskStatus } from '../worker-utils';
import type { TranscriptEntry } from '@/lib/gemini/types';

// ============================================================
// Global Worker Instance (Singleton)
// ============================================================

const globalForWorker = global as unknown as {
  interviewAnalysisWorker: Worker | undefined;
};

// ============================================================
// Types
// ============================================================

interface InterviewAnalysisResult {
  score: number;
  strengths: string[];
  improvements: string[];
}

// ============================================================
// Job Processor
// ============================================================

/**
 * Process an interview analysis job
 */
async function processInterviewAnalysisJob(
  job: Job<InterviewAnalysisJobData>
): Promise<InterviewAnalysisResult> {
  const { taskId, userId, interviewId } = job.data;

  const logContext = {
    module: 'interview-analysis-worker',
    action: 'process',
    jobId: job.id,
    taskId,
    userId,
    interviewId,
  };

  logger.info('Processing interview analysis job', logContext);

  try {
    // Update task to processing
    await updateTaskStatus(taskId, 'processing', { progress: 10 });

    // Get the interview record with user (for resume)
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        user: {
          select: {
            resumeContent: true,
          },
        },
      },
    });

    if (!interview) {
      throw new Error(`Interview not found: ${interviewId}`);
    }

    // Authorization check: verify userId matches
    if (interview.userId !== userId) {
      logger.error('Authorization failed: userId mismatch', undefined, {
        ...logContext,
        expectedUserId: interview.userId,
        providedUserId: userId,
      });
      throw new Error('Unauthorized: Interview does not belong to user');
    }

    // Get transcript and language from interview
    const transcripts = interview.transcript as unknown as TranscriptEntry[];
    const language =
      ((interview.jobDescription as { language?: string })?.language as 'en' | 'zh-TW') || 'zh-TW';

    // Get full job description object
    const jobDescription = interview.jobDescription as
      | import('@/lib/jd/types').JobDescription
      | null;

    // Parse user resume content
    let resumeContent: import('@/lib/resume/types').ResumeContent | null = null;
    if (interview.user?.resumeContent) {
      try {
        resumeContent = JSON.parse(interview.user.resumeContent);
      } catch {
        logger.warn('Failed to parse resume content', {
          ...logContext,
          resumeContentLength: interview.user.resumeContent.length,
        });
      }
    }

    logger.info('Found interview record', {
      ...logContext,
      transcriptCount: transcripts?.length || 0,
      language,
      hasJobDescription: !!jobDescription,
      jdTitle: jobDescription?.title,
      hasResume: !!resumeContent,
      resumeName: resumeContent?.name,
    });

    if (!transcripts || transcripts.length === 0) {
      throw new Error('Interview has no transcript');
    }

    // Update progress
    await updateTaskStatus(taskId, 'processing', { progress: 20 });

    // Perform AI analysis
    logger.info('Starting AI analysis', {
      ...logContext,
      transcriptCount: transcripts.length,
      hasJdContext: !!jobDescription,
      hasResumeContext: !!resumeContent,
    });

    const analysis = await analyzeInterview({
      transcripts,
      jobDescription,
      resume: resumeContent,
      language,
    });

    // Update progress
    await updateTaskStatus(taskId, 'processing', { progress: 70 });

    logger.info('AI analysis completed', {
      ...logContext,
      score: analysis.score,
      strengthsCount: analysis.strengths.length,
      improvementsCount: analysis.improvements.length,
    });

    // Update progress
    await updateTaskStatus(taskId, 'processing', { progress: 90 });

    // Update interview with analysis results
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        score: analysis.score,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        modelAnswer: analysis.modelAnswer as unknown as Parameters<
          typeof prisma.interview.update
        >[0]['data']['modelAnswer'],
      },
    });

    // Create result
    const result: InterviewAnalysisResult = {
      score: analysis.score,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
    };

    // Update task to completed
    await updateTaskStatus(taskId, 'completed', {
      progress: 100,
      result,
    });

    logger.info('Interview analysis completed', {
      ...logContext,
      score: analysis.score,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Interview analysis failed', error as Error, logContext);

    // Update task to failed
    await updateTaskStatus(taskId, 'failed', {
      error: errorMessage,
    });

    throw error;
  }
}

// ============================================================
// Worker Factory
// ============================================================

/**
 * Get or create the interview analysis worker singleton
 */
export function getInterviewAnalysisWorker(): Worker<
  InterviewAnalysisJobData,
  InterviewAnalysisResult
> {
  if (!globalForWorker.interviewAnalysisWorker) {
    const connection = getRedisConnection();

    globalForWorker.interviewAnalysisWorker = new Worker<
      InterviewAnalysisJobData,
      InterviewAnalysisResult
    >(QUEUE_NAMES.INTERVIEW_ANALYSIS, processInterviewAnalysisJob, {
      // Type assertion needed due to ioredis version mismatch between bullmq and project
      connection: connection.duplicate() as unknown as ConnectionOptions,
      concurrency: 2, // Process up to 2 jobs concurrently
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });

    // Set up event handlers
    globalForWorker.interviewAnalysisWorker.on('completed', (job) => {
      logger.info('Interview analysis job completed', {
        module: 'interview-analysis-worker',
        action: 'completed',
        jobId: job.id,
        taskId: job.data.taskId,
        interviewId: job.data.interviewId,
      });
    });

    globalForWorker.interviewAnalysisWorker.on('failed', (job, error) => {
      logger.error('Interview analysis job failed', error, {
        module: 'interview-analysis-worker',
        action: 'failed',
        jobId: job?.id,
        taskId: job?.data.taskId,
        interviewId: job?.data.interviewId,
      });
    });

    globalForWorker.interviewAnalysisWorker.on('error', (error) => {
      logger.error('Interview analysis worker error', error, {
        module: 'interview-analysis-worker',
        action: 'worker-error',
      });
    });

    globalForWorker.interviewAnalysisWorker.on('active', (job) => {
      logger.info('Interview analysis job active', {
        module: 'interview-analysis-worker',
        action: 'active',
        jobId: job.id,
        taskId: job.data.taskId,
        interviewId: job.data.interviewId,
      });
    });

    logger.info('Interview analysis worker started', {
      module: 'interview-analysis-worker',
      action: 'start',
    });
  }

  return globalForWorker.interviewAnalysisWorker as Worker<
    InterviewAnalysisJobData,
    InterviewAnalysisResult
  >;
}

/**
 * Start the interview analysis worker
 */
export function startInterviewAnalysisWorker(): void {
  getInterviewAnalysisWorker();
}

/**
 * Close the worker gracefully
 */
export async function closeInterviewAnalysisWorker(): Promise<void> {
  if (globalForWorker.interviewAnalysisWorker) {
    await globalForWorker.interviewAnalysisWorker.close();
    globalForWorker.interviewAnalysisWorker = undefined;

    logger.info('Interview analysis worker closed', {
      module: 'interview-analysis-worker',
      action: 'close',
    });
  }
}
