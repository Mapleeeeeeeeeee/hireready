/**
 * BullMQ Queue instances for background job processing
 */

import { Queue, type ConnectionOptions } from 'bullmq';

import { logger } from '../utils/logger';

import { getRedisConnection } from './connection';
import { type InterviewAnalysisJobData, QUEUE_NAMES, type ResumeParsingJobData } from './types';

// Use global to prevent HMR from creating multiple queue instances
const globalForQueues = global as unknown as {
  interviewAnalysisQueue: Queue | undefined;
  resumeParsingQueue: Queue | undefined;
};

// Default job options for all queues
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000, // Initial delay of 1 second
  },
  removeOnComplete: {
    count: 100, // Keep last 100 completed jobs
    age: 24 * 60 * 60, // Keep for 24 hours
  },
  removeOnFail: {
    count: 50, // Keep last 50 failed jobs
    age: 7 * 24 * 60 * 60, // Keep for 7 days
  },
};

/**
 * Get or create the Interview Analysis Queue
 */
export function getInterviewAnalysisQueue(): Queue<InterviewAnalysisJobData> {
  if (!globalForQueues.interviewAnalysisQueue) {
    const connection = getRedisConnection();
    globalForQueues.interviewAnalysisQueue = new Queue(QUEUE_NAMES.INTERVIEW_ANALYSIS, {
      // Type assertion needed due to ioredis version mismatch between bullmq and project
      connection: connection.duplicate() as unknown as ConnectionOptions,
      defaultJobOptions,
    });
  }

  return globalForQueues.interviewAnalysisQueue as Queue<InterviewAnalysisJobData>;
}

/**
 * Get or create the Resume Parsing Queue
 */
export function getResumeParsingQueue(): Queue<ResumeParsingJobData> {
  if (!globalForQueues.resumeParsingQueue) {
    const connection = getRedisConnection();
    globalForQueues.resumeParsingQueue = new Queue(QUEUE_NAMES.RESUME_PARSING, {
      // Type assertion needed due to ioredis version mismatch between bullmq and project
      connection: connection.duplicate() as unknown as ConnectionOptions,
      defaultJobOptions,
    });
  }

  return globalForQueues.resumeParsingQueue as Queue<ResumeParsingJobData>;
}

/**
 * Close all queue connections
 * Should be called during graceful shutdown
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (globalForQueues.interviewAnalysisQueue) {
    closePromises.push(globalForQueues.interviewAnalysisQueue.close());
    globalForQueues.interviewAnalysisQueue = undefined;
  }

  if (globalForQueues.resumeParsingQueue) {
    closePromises.push(globalForQueues.resumeParsingQueue.close());
    globalForQueues.resumeParsingQueue = undefined;
  }

  await Promise.all(closePromises);
  logger.info('All queues closed', {
    module: 'queue',
    action: 'queue_close',
  });
}
