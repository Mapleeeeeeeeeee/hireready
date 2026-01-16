/**
 * Interview Save API Route
 * POST /api/interview/save
 * Saves interview transcript and metadata to database
 * Analysis is performed asynchronously via background queue
 */

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { validators } from '@/lib/utils/validation';
import { Ok, Err, Result } from '@/lib/utils/result';
import { ValidationError, BadRequestError } from '@/lib/utils/errors';
import { parseJsonBody } from '@/lib/utils/resource-helpers';
import { logger } from '@/lib/utils/logger';
import { isRedisAvailable } from '@/lib/queue/connection';
import { getInterviewAnalysisQueue } from '@/lib/queue/queues';
import { isValidUrl } from '@/lib/jd/validators';
import type { TranscriptEntry } from '@/lib/gemini/types';

// ============================================================
// Request Validation
// ============================================================

interface SaveInterviewInput {
  transcripts: TranscriptEntry[];
  duration: number;
  feedback?: string;
  language: 'en' | 'zh-TW';
  jobDescriptionUrl?: string;
  jobDescription?: unknown;
}

function validateSaveInterviewInput(
  body: unknown
): Result<SaveInterviewInput, ValidationError | BadRequestError> {
  if (typeof body !== 'object' || body === null) {
    return Err(new BadRequestError('Invalid request body'));
  }

  const data = body as Record<string, unknown>;

  // Validate transcripts
  const transcriptsResult = validators.array<TranscriptEntry>('transcripts')(data.transcripts);
  if (!transcriptsResult.ok) return transcriptsResult;

  // Validate duration
  const durationResult = validators.positiveInt('duration')(data.duration);
  if (!durationResult.ok) return durationResult;

  // Validate feedback (optional)
  const feedbackResult = validators.optional(validators.string('feedback'))(data.feedback);
  if (!feedbackResult.ok) return feedbackResult;

  // Validate language
  const languageResult = validators.oneOf('language', ['en', 'zh-TW'] as const)(data.language);
  if (!languageResult.ok) return languageResult;

  // Validate jobDescriptionUrl (optional, must be valid URL if provided)
  let jobDescriptionUrl: string | undefined;
  if (data.jobDescriptionUrl !== undefined && data.jobDescriptionUrl !== null) {
    const urlResult = validators.string('jobDescriptionUrl')(data.jobDescriptionUrl);
    if (!urlResult.ok) return urlResult;

    if (urlResult.value.trim() !== '' && !isValidUrl(urlResult.value)) {
      return Err(new ValidationError('jobDescriptionUrl', 'jobDescriptionUrl must be a valid URL'));
    }

    jobDescriptionUrl = urlResult.value.trim() || undefined;
  }

  // Validate jobDescription (optional, must be object if provided)
  let jobDescription: unknown = undefined;
  if (data.jobDescription !== undefined && data.jobDescription !== null) {
    if (typeof data.jobDescription !== 'object') {
      return Err(new ValidationError('jobDescription', 'jobDescription must be an object'));
    }
    jobDescription = data.jobDescription;
  }

  return Ok({
    transcripts: transcriptsResult.value,
    duration: durationResult.value,
    feedback: feedbackResult.value,
    language: languageResult.value,
    jobDescriptionUrl,
    jobDescription,
  });
}

// ============================================================
// Response Type
// ============================================================

interface SaveInterviewApiResponse {
  id: string;
  createdAt: string;
  taskId: string | null;
}

// ============================================================
// Route Handler
// ============================================================

async function handleSaveInterview(
  request: Request,
  userId: string
): Promise<SaveInterviewApiResponse> {
  // Parse and validate request body
  const body = await parseJsonBody<unknown>(request);
  const validationResult = validateSaveInterviewInput(body);

  if (!validationResult.ok) {
    throw validationResult.error;
  }

  const { transcripts, duration, feedback, language, jobDescriptionUrl, jobDescription } =
    validationResult.value;

  // Ensure language is included in jobDescription for analysis worker
  const jobDescriptionWithLanguage = {
    ...(jobDescription as Record<string, unknown> | undefined),
    language,
  };

  // Step 1: Save basic interview record first
  const interview = await prisma.interview.create({
    data: {
      userId,
      status: 'completed',
      duration,
      feedback,
      jobDescriptionUrl,
      jobDescription: jobDescriptionWithLanguage as unknown as Parameters<
        typeof prisma.interview.create
      >[0]['data']['jobDescription'],
      transcript: transcripts as unknown as Parameters<
        typeof prisma.interview.create
      >[0]['data']['transcript'],
      // score, strengths, improvements, modelAnswer will be filled by AI analysis worker
    },
  });

  logger.info('Interview saved', {
    module: 'api-interview-save',
    action: 'save',
    interviewId: interview.id,
    transcriptCount: transcripts.length,
    hasJobDescription: !!jobDescriptionUrl,
    language,
  });

  // Step 2: Create background task and push to queue (if Redis is available)
  let taskId: string | null = null;

  if (isRedisAvailable()) {
    try {
      // Create background task record
      const task = await prisma.backgroundTask.create({
        data: {
          userId,
          type: 'interview_analysis',
          status: 'pending',
          resourceId: interview.id,
          progress: 0,
        },
      });

      taskId = task.id;

      // Push job to queue
      const queue = getInterviewAnalysisQueue();
      await queue.add(
        `analysis-${interview.id}`,
        {
          taskId: task.id,
          userId,
          interviewId: interview.id,
        },
        {
          // Job-specific options
          jobId: `interview-analysis-${interview.id}`,
        }
      );

      logger.info('Interview analysis job queued', {
        module: 'api-interview-save',
        action: 'queue',
        interviewId: interview.id,
        taskId: task.id,
      });
    } catch (error) {
      logger.error('Failed to queue interview analysis', error as Error, {
        module: 'api-interview-save',
        action: 'queue',
        interviewId: interview.id,
      });
      // Don't fail the request - interview is saved, analysis can be retried later
    }
  } else {
    logger.warn('Redis not available, skipping analysis queue', {
      module: 'api-interview-save',
      action: 'queue',
      interviewId: interview.id,
    });
  }

  return {
    id: interview.id,
    createdAt: interview.createdAt.toISOString(),
    taskId,
  };
}

export const POST = withAuthHandler(handleSaveInterview, {
  module: 'api-interview',
  action: 'save',
});
