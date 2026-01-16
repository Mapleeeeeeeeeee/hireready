/**
 * Resume Upload API Route
 * POST /api/resume/upload
 * Handles resume file upload, saves to disk, and queues parsing job
 */

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { BadRequestError, ValidationError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import {
  saveResumeFile,
  RESUME_CONSTRAINTS,
  isAllowedResumeType,
  validateFileSignature,
} from '@/lib/resume';
import { getResumeParsingQueue } from '@/lib/queue/queues';
import { isRedisAvailable } from '@/lib/queue/connection';
import type { ResumeParsingJobData } from '@/lib/queue/types';

// ============================================================
// Types
// ============================================================

interface ResumeUploadResponse {
  url: string;
  fileName: string;
  content: null;
  taskId: string | null;
  updatedAt: Date;
}

// ============================================================
// Constants
// ============================================================

const MAX_FILE_SIZE_MB = RESUME_CONSTRAINTS.maxFileSize / 1024 / 1024;

// ============================================================
// Route Handler
// ============================================================

async function handleUploadResume(request: Request, userId: string): Promise<ResumeUploadResponse> {
  const logContext = { module: 'api-resume', action: 'upload', userId };

  logger.info('Processing resume upload', logContext);

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    logger.error('Failed to parse form data', error as Error, logContext);
    throw new BadRequestError('Invalid form data. Expected multipart/form-data');
  }

  // Get the file from form data
  const file = formData.get('file');

  if (!file) {
    throw new ValidationError('file', 'No file provided');
  }

  if (!(file instanceof File)) {
    throw new ValidationError('file', 'Invalid file format');
  }

  logger.info('File received', {
    ...logContext,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  // Validate file type
  if (!isAllowedResumeType(file.type)) {
    throw new ValidationError(
      'file',
      `Invalid file type: ${file.type}. Allowed types: PDF, JPG, PNG`
    );
  }

  // Validate file size
  if (file.size > RESUME_CONSTRAINTS.maxFileSize) {
    throw new ValidationError(
      'file',
      `File too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum: ${MAX_FILE_SIZE_MB}MB`
    );
  }

  // Validate file name (basic sanitization check)
  const fileName = file.name;
  if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new ValidationError('file', 'Invalid file name');
  }

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  // Validate file signature (magic number check)
  // This ensures the file content matches its declared MIME type
  if (!validateFileSignature(fileBuffer, file.type)) {
    logger.warn('File signature validation failed', {
      ...logContext,
      declaredType: file.type,
      fileName: file.name,
    });
    throw new ValidationError(
      'file',
      'File content does not match declared file type. Please upload a valid PDF, JPG, or PNG file.'
    );
  }

  // Step 1: Save file to disk
  const { url } = await saveResumeFile(userId, fileBuffer, file.type, fileName);

  // Step 2: Update database with file info (without parsed content)
  const updatedAt = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: {
      resumeUrl: url,
      resumeFileName: fileName,
      resumeContent: null, // Will be updated when parsing completes
      resumeUpdatedAt: updatedAt,
    },
  });

  // Step 3: Create background task and queue parsing job
  let taskId: string | null = null;

  if (isRedisAvailable()) {
    // Create background task record
    const task = await prisma.backgroundTask.create({
      data: {
        userId,
        type: 'resume_parsing',
        status: 'pending',
        progress: 0,
      },
    });

    taskId = task.id;

    // Queue the parsing job
    const jobData: ResumeParsingJobData = {
      taskId: task.id,
      userId,
      resumeUrl: url,
      resumeFileName: fileName,
    };

    const queue = getResumeParsingQueue();
    await queue.add('parse-resume', jobData, {
      jobId: task.id,
    });

    logger.info('Resume parsing job queued', {
      ...logContext,
      taskId: task.id,
      url,
    });
  } else {
    logger.warn('Redis not available, skipping queue', logContext);
  }

  logger.info('Resume uploaded successfully', {
    ...logContext,
    url,
    taskId,
  });

  return {
    url,
    fileName,
    content: null,
    taskId,
    updatedAt,
  };
}

export const POST = withAuthHandler(handleUploadResume, {
  module: 'api-resume',
  action: 'upload',
});
