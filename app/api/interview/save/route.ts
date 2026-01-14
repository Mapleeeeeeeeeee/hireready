/**
 * Interview Save API Route
 * POST /api/interview/save
 * Saves interview transcript and metadata to database
 */

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { validators } from '@/lib/utils/validation';
import { Ok, Err, Result } from '@/lib/utils/result';
import { ValidationError, BadRequestError } from '@/lib/utils/errors';
import { parseJsonBody } from '@/lib/utils/resource-helpers';
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

async function handleSaveInterview(
  request: Request,
  userId: string
): Promise<SaveInterviewResponse> {
  // Parse and validate request body
  const body = await parseJsonBody<unknown>(request);
  const validationResult = validateSaveInterviewInput(body);

  if (!validationResult.ok) {
    throw validationResult.error;
  }

  const { transcripts, duration, feedback } = validationResult.value;

  // Save to database
  const interview = await prisma.interview.create({
    data: {
      userId,
      scenario: 'behavioral',
      status: 'completed',
      duration,
      feedback,
      transcript: transcripts as unknown as Parameters<
        typeof prisma.interview.create
      >[0]['data']['transcript'],
    },
  });

  return {
    id: interview.id,
    createdAt: interview.createdAt.toISOString(),
  };
}

export const POST = withAuthHandler(handleSaveInterview, {
  module: 'api-interview',
  action: 'save',
});
