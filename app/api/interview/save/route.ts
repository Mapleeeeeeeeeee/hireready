/**
 * Interview Save API Route
 * POST /api/interview/save
 * Saves interview transcript and metadata to database
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { jsonSuccess, jsonError } from '@/lib/utils/api-response';
import { validators } from '@/lib/utils/validation';
import { Ok, Err, Result } from '@/lib/utils/result';
import { UnauthorizedError, ValidationError, BadRequestError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import type { SaveInterviewResponse, TranscriptEntry } from '@/lib/gemini/types';

// ============================================================
// Request Validation
// ============================================================

interface SaveInterviewInput {
  transcripts: TranscriptEntry[];
  duration: number;
  feedback?: string;
  language: 'en' | 'zh-TW';
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

  return Ok({
    transcripts: transcriptsResult.value,
    duration: durationResult.value,
    feedback: feedbackResult.value,
    language: languageResult.value,
  });
}

// ============================================================
// Route Handler
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  logger.info('Interview save request started', {
    module: 'api-interview',
    action: 'save',
    requestId,
  });

  try {
    // Validate authentication
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      logger.warn('Unauthorized interview save attempt', {
        module: 'api-interview',
        action: 'save',
        requestId,
      });
      return jsonError(new UnauthorizedError('Please login to save interview'));
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = validateSaveInterviewInput(body);

    if (!validationResult.ok) {
      return jsonError(validationResult.error);
    }

    const { transcripts, duration, feedback } = validationResult.value;

    // Save to database
    const interview = await prisma.interview.create({
      data: {
        userId: session.user.id,
        scenario: 'behavioral',
        status: 'completed',
        duration,
        feedback,
        transcript: transcripts as unknown as Parameters<
          typeof prisma.interview.create
        >[0]['data']['transcript'],
      },
    });

    const durationMs = Date.now() - startTime;
    logger.info('Interview saved successfully', {
      module: 'api-interview',
      action: 'save',
      requestId,
      interviewId: interview.id,
      durationMs,
    });

    return jsonSuccess<SaveInterviewResponse>({
      id: interview.id,
      createdAt: interview.createdAt.toISOString(),
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Interview save failed', error as Error, {
      module: 'api-interview',
      action: 'save',
      requestId,
      durationMs,
    });
    return jsonError(error);
  }
}
