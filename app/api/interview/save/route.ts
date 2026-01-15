/**
 * Interview Save API Route
 * POST /api/interview/save
 * Saves interview transcript and metadata to database
 */

import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { validators } from '@/lib/utils/validation';
import { Ok, Err, Result } from '@/lib/utils/result';
import { ValidationError, BadRequestError } from '@/lib/utils/errors';
import { parseJsonBody } from '@/lib/utils/resource-helpers';
import { logger } from '@/lib/utils/logger';
import { analyzeInterview } from '@/lib/gemini/analysis-service';
import { isValidUrl } from '@/lib/jd/validators';
import type { SaveInterviewResponse, TranscriptEntry } from '@/lib/gemini/types';

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

  const { transcripts, duration, feedback, language, jobDescriptionUrl, jobDescription } =
    validationResult.value;

  // Step 1: Save basic interview record first
  const interview = await prisma.interview.create({
    data: {
      userId,
      status: 'completed',
      duration,
      feedback,
      jobDescriptionUrl,
      jobDescription: jobDescription as unknown as Parameters<
        typeof prisma.interview.create
      >[0]['data']['jobDescription'],
      transcript: transcripts as unknown as Parameters<
        typeof prisma.interview.create
      >[0]['data']['transcript'],
      // score, strengths, improvements, modelAnswer will be filled by AI analysis
    },
  });

  // Step 2: Perform AI analysis asynchronously (errors should not fail the save)
  try {
    logger.info('Preparing for AI analysis', {
      module: 'api-interview-save',
      action: 'pre-analyze',
      interviewId: interview.id,
      transcriptCount: transcripts.length,
      hasJobDescription: !!jobDescriptionUrl,
      language,
    });

    logger.info('Starting AI analysis', {
      module: 'api-interview-save',
      action: 'analyze',
      interviewId: interview.id,
    });

    const analysis = await analyzeInterview({
      transcripts,
      jobDescriptionUrl,
      language,
    });

    logger.info('AI analysis result received', {
      module: 'api-interview-save',
      action: 'analyze',
      interviewId: interview.id,
      hasScore: !!analysis.score,
      strengthsCount: analysis.strengths.length,
      improvementsCount: analysis.improvements.length,
      hasAudio: !!analysis.modelAnswer.audioUrl,
    });

    // Step 3: Rename audio file from UUID to interview ID
    if (analysis.modelAnswer.audioUrl) {
      // Validate interview ID format (CUID)
      if (!/^c[a-z0-9]{24}$/i.test(interview.id)) {
        logger.error('Invalid interview ID format', undefined, {
          module: 'api-interview-save',
          action: 'rename-audio',
          interviewId: interview.id,
        });
        throw new Error('Invalid interview ID format');
      }

      const modelAnswersDir = path.join(process.cwd(), 'public', 'model-answers');
      const oldFileName = path.basename(analysis.modelAnswer.audioUrl);
      const oldPath = path.resolve(modelAnswersDir, oldFileName);
      const newPath = path.resolve(modelAnswersDir, `${interview.id}.mp3`);

      // Verify resolved paths are within model-answers directory
      if (!oldPath.startsWith(modelAnswersDir) || !newPath.startsWith(modelAnswersDir)) {
        logger.error('Invalid file path detected', undefined, {
          module: 'api-interview-save',
          action: 'rename-audio',
          oldPath,
          newPath,
        });
        throw new Error('Invalid file path');
      }

      try {
        await fs.rename(oldPath, newPath);
        analysis.modelAnswer.audioUrl = `/model-answers/${interview.id}.mp3`;
      } catch (renameError) {
        logger.error('Failed to rename audio file', renameError as Error, {
          module: 'api-interview-save',
          action: 'rename-audio',
          interviewId: interview.id,
        });
        // Continue execution, keep original path
      }
    }

    // Step 4: Update interview with AI analysis results
    await prisma.interview.update({
      where: { id: interview.id },
      data: {
        score: analysis.score,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        modelAnswer: analysis.modelAnswer as unknown as Parameters<
          typeof prisma.interview.update
        >[0]['data']['modelAnswer'],
      },
    });

    logger.info('AI analysis completed', {
      module: 'api-interview-save',
      action: 'analyze',
      interviewId: interview.id,
      score: analysis.score,
    });
  } catch (error) {
    logger.error('AI analysis failed, interview saved without analysis', error as Error, {
      module: 'api-interview-save',
      action: 'analyze',
      interviewId: interview.id,
      errorMessage: (error as Error).message,
      errorStack: (error as Error).stack,
    });
    // Do not throw error - interview record is still saved
  }

  return {
    id: interview.id,
    createdAt: interview.createdAt.toISOString(),
  };
}

export const POST = withAuthHandler(handleSaveInterview, {
  module: 'api-interview',
  action: 'save',
});
