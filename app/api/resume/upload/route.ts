/**
 * Resume Upload API Route
 * POST /api/resume/upload
 * Handles resume file upload, saves to disk, and parses content using Gemini
 */

import { withAuthHandler } from '@/lib/utils/api-response';
import { BadRequestError, ValidationError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import {
  saveResume,
  RESUME_CONSTRAINTS,
  isAllowedResumeType,
  validateFileSignature,
} from '@/lib/resume';
import type { ResumeData } from '@/lib/resume';

// ============================================================
// Constants
// ============================================================

const MAX_FILE_SIZE_MB = RESUME_CONSTRAINTS.maxFileSize / 1024 / 1024;

// ============================================================
// Route Handler
// ============================================================

async function handleUploadResume(request: Request, userId: string): Promise<ResumeData> {
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

  // Save resume (includes file save + Gemini parsing + DB update)
  try {
    const resumeData = await saveResume(userId, fileBuffer, file.type, fileName);

    logger.info('Resume uploaded successfully', {
      ...logContext,
      url: resumeData.url,
      hasParsedContent: !!resumeData.content,
    });

    return resumeData;
  } catch (error) {
    logger.error('Failed to save resume', error as Error, logContext);
    throw error;
  }
}

export const POST = withAuthHandler(handleUploadResume, {
  module: 'api-resume',
  action: 'upload',
});
