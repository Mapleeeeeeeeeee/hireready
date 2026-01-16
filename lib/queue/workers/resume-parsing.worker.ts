/**
 * Resume Parsing Worker
 * Processes resume parsing jobs from the queue
 */

import { Worker, type Job, type ConnectionOptions } from 'bullmq';

import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import { parseResume } from '../../resume/gemini-parser';
import { getResumeFilePath } from '../../resume/resume-service';
import { getRedisConnection } from '../connection';
import { QUEUE_NAMES, type ResumeParsingJobData, type ResumeParsingResult } from '../types';
import { updateTaskStatus } from '../worker-utils';

// ============================================================
// Global Worker Instance (Singleton)
// ============================================================

const globalForWorker = global as unknown as {
  resumeParsingWorker: Worker | undefined;
};

// ============================================================
// Job Processor
// ============================================================

/**
 * Process a resume parsing job
 */
async function processResumeParsingJob(
  job: Job<ResumeParsingJobData>
): Promise<ResumeParsingResult> {
  const { taskId, userId } = job.data;

  const logContext = {
    module: 'resume-parsing-worker',
    action: 'process',
    jobId: job.id,
    taskId,
    userId,
  };

  logger.info('Processing resume parsing job', logContext);

  try {
    // Update task to processing
    await updateTaskStatus(taskId, 'processing', { progress: 10 });

    // Get the file path from the resume URL
    const resumeFile = await getResumeFilePath(userId);

    if (!resumeFile) {
      throw new Error('Resume file not found');
    }

    const { filePath } = resumeFile;

    logger.info('Found resume file', {
      ...logContext,
      filePath,
    });

    // Parse resume using Gemini
    const content = await parseResume(filePath);

    // Update progress
    await updateTaskStatus(taskId, 'processing', { progress: 80 });

    // Update user's resume content in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        resumeContent: JSON.stringify(content),
        resumeUpdatedAt: new Date(),
      },
    });

    // Create result
    const result: ResumeParsingResult = {
      content: JSON.stringify(content),
      parsedAt: new Date().toISOString(),
    };

    logger.info('Updating task status to completed', {
      ...logContext,
      resultContentLength: result.content.length,
    });

    // Update task to completed
    await updateTaskStatus(taskId, 'completed', {
      progress: 100,
      result,
    });

    logger.info('Resume parsing completed successfully', {
      ...logContext,
      hasName: !!content.name,
      skillsCount: content.skills?.length || 0,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Resume parsing failed', error as Error, logContext);

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
 * Get or create the resume parsing worker singleton
 */
export function getResumeParsingWorker(): Worker<ResumeParsingJobData, ResumeParsingResult> {
  if (!globalForWorker.resumeParsingWorker) {
    const connection = getRedisConnection();

    globalForWorker.resumeParsingWorker = new Worker<ResumeParsingJobData, ResumeParsingResult>(
      QUEUE_NAMES.RESUME_PARSING,
      processResumeParsingJob,
      {
        // Type assertion needed due to ioredis version mismatch between bullmq and project
        connection: connection.duplicate() as unknown as ConnectionOptions,
        concurrency: 2, // Process up to 2 jobs concurrently
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );

    // Set up event handlers
    globalForWorker.resumeParsingWorker.on('completed', (job) => {
      logger.info('Resume parsing job completed', {
        module: 'resume-parsing-worker',
        action: 'completed',
        jobId: job.id,
        taskId: job.data.taskId,
      });
    });

    globalForWorker.resumeParsingWorker.on('failed', (job, error) => {
      logger.error('Resume parsing job failed', error, {
        module: 'resume-parsing-worker',
        action: 'failed',
        jobId: job?.id,
        taskId: job?.data.taskId,
      });
    });

    globalForWorker.resumeParsingWorker.on('error', (error) => {
      logger.error('Resume parsing worker error', error, {
        module: 'resume-parsing-worker',
        action: 'worker-error',
      });
    });

    globalForWorker.resumeParsingWorker.on('active', (job) => {
      logger.info('Resume parsing job active', {
        module: 'resume-parsing-worker',
        action: 'active',
        jobId: job.id,
        taskId: job.data.taskId,
      });
    });

    logger.info('Resume parsing worker started', {
      module: 'resume-parsing-worker',
      action: 'start',
    });
  }

  return globalForWorker.resumeParsingWorker as Worker<ResumeParsingJobData, ResumeParsingResult>;
}

/**
 * Start the resume parsing worker
 */
export function startResumeParsingWorker(): void {
  getResumeParsingWorker();
}

/**
 * Close the worker gracefully
 */
export async function closeResumeParsingWorker(): Promise<void> {
  if (globalForWorker.resumeParsingWorker) {
    await globalForWorker.resumeParsingWorker.close();
    globalForWorker.resumeParsingWorker = undefined;

    logger.info('Resume parsing worker closed', {
      module: 'resume-parsing-worker',
      action: 'close',
    });
  }
}
