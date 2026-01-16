/**
 * Resume service for file management and database operations
 * Handles saving, retrieving, and deleting user resumes
 *
 * Note: This file is server-only due to fs and prisma usage.
 * Do NOT add 'use server' directive - this is a service module, not Server Actions.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/utils/logger';
import { parseResume } from './gemini-parser';
import {
  type ResumeContent,
  type ResumeData,
  getExtensionFromMimeType,
  isAllowedResumeType,
  RESUME_CONSTRAINTS,
} from './types';

// ============================================================
// Constants (exported for reuse in workers)
// ============================================================

export const STORAGE_DIR = 'storage';
export const RESUMES_DIR = 'resumes';
export const RESUME_FILENAME = 'resume'; // Fixed filename, extension varies
export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.png'];

// ============================================================
// Path Utilities
// ============================================================

/**
 * Get the base directory for storing resumes (private, outside public folder)
 */
function getResumesBasePath(): string {
  return path.join(process.cwd(), STORAGE_DIR, RESUMES_DIR);
}

/**
 * Get the directory path for a specific user's resume
 * userId is already validated by auth session, but we add basic checks
 * to prevent path traversal in case of bugs or misuse
 */
function getUserResumePath(userId: string): string {
  // Basic validation to prevent path traversal
  if (!userId || userId.includes('..') || userId.includes('/') || userId.includes('\\')) {
    throw new Error('Invalid user ID');
  }
  return path.join(getResumesBasePath(), userId);
}

/**
 * Get the API URL path for accessing resume file (requires authentication)
 */
function getResumeUrl(_userId: string, extension: string): string {
  // Return API endpoint path instead of direct file path
  // The extension is included as a query param to help with content-type
  return `/api/resume/file?ext=${extension.replace('.', '')}`;
}

// ============================================================
// File Operations
// ============================================================

/**
 * Save a resume file to disk
 * @param userId - User ID (from authenticated session)
 * @param fileBuffer - File content as Buffer
 * @param mimeType - File MIME type
 * @param originalFileName - Original file name for reference
 * @returns Path to the saved file and public URL
 */
export async function saveResumeFile(
  userId: string,
  fileBuffer: Buffer,
  mimeType: string,
  originalFileName: string
): Promise<{ filePath: string; url: string; fileName: string }> {
  const logContext = { module: 'resume-service', action: 'saveResumeFile' };

  logger.info('Saving resume file', {
    ...logContext,
    userId,
    mimeType,
    fileSize: fileBuffer.length,
    originalFileName,
  });

  // Validate file type
  if (!isAllowedResumeType(mimeType)) {
    throw new Error(`Invalid file type: ${mimeType}. Allowed types: PDF, JPG, PNG`);
  }

  // Validate file size
  if (fileBuffer.length > RESUME_CONSTRAINTS.maxFileSize) {
    throw new Error(
      `File too large: ${Math.round(fileBuffer.length / 1024 / 1024)}MB. Maximum: 10MB`
    );
  }

  // getUserResumePath validates userId to prevent path traversal
  const userDir = getUserResumePath(userId);

  // Ensure user directory exists
  await fs.mkdir(userDir, { recursive: true });

  // Delete existing resume files (fixed filenames, no need for readdir)
  await Promise.all(
    ALLOWED_EXTENSIONS.map((ext) =>
      fs.unlink(path.join(userDir, `${RESUME_FILENAME}${ext}`)).catch(() => {
        // Ignore errors - file might not exist
      })
    )
  );

  // Save new file
  const extension = getExtensionFromMimeType(mimeType);
  const fileName = `${RESUME_FILENAME}${extension}`;
  const filePath = path.join(userDir, fileName);

  await fs.writeFile(filePath, fileBuffer);

  const url = getResumeUrl(userId, extension);

  logger.info('Resume file saved successfully', {
    ...logContext,
    filePath,
    url,
  });

  return {
    filePath,
    url,
    fileName: originalFileName,
  };
}

/**
 * Delete a user's resume file from disk
 */
export async function deleteResumeFile(userId: string): Promise<void> {
  const logContext = { module: 'resume-service', action: 'deleteResumeFile' };

  logger.info('Deleting resume file', { ...logContext, userId });

  // getUserResumePath validates userId
  const userDir = getUserResumePath(userId);

  // Delete all possible resume files (fixed filenames)
  await Promise.all(
    ALLOWED_EXTENSIONS.map((ext) =>
      fs.unlink(path.join(userDir, `${RESUME_FILENAME}${ext}`)).catch(() => {
        // Ignore errors - file might not exist
      })
    )
  );

  // Try to remove the user directory if empty
  try {
    await fs.rmdir(userDir);
    logger.info('Removed empty user directory', { ...logContext, userDir });
  } catch {
    // Directory might not be empty or might not exist, which is fine
  }
}

// ============================================================
// Database Operations
// ============================================================

/**
 * Save resume to database and parse content
 * @param userId - User ID (from authenticated session)
 * @param fileBuffer - File content as Buffer
 * @param mimeType - File MIME type
 * @param originalFileName - Original file name
 * @returns Parsed resume data
 */
export async function saveResume(
  userId: string,
  fileBuffer: Buffer,
  mimeType: string,
  originalFileName: string
): Promise<ResumeData> {
  const logContext = { module: 'resume-service', action: 'saveResume' };

  logger.info('Starting resume save process', {
    ...logContext,
    userId,
    mimeType,
    fileSize: fileBuffer.length,
  });

  // Track saved file path for cleanup on error
  let savedFilePath: string | null = null;

  try {
    // Step 1: Save file to disk
    const { filePath, url, fileName } = await saveResumeFile(
      userId,
      fileBuffer,
      mimeType,
      originalFileName
    );
    savedFilePath = filePath;

    // Step 2: Parse resume content using Gemini
    let content: ResumeContent | null = null;
    try {
      content = await parseResume(filePath);
    } catch (error) {
      logger.warn('Failed to parse resume content, saving without parsing', {
        ...logContext,
        error: (error as Error).message,
      });
      // Continue without parsed content - file is still saved
    }

    // Step 3: Update database
    const updatedAt = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: {
        resumeUrl: url,
        resumeFileName: fileName,
        resumeContent: content ? JSON.stringify(content) : null,
        resumeUpdatedAt: updatedAt,
      },
    });

    logger.info('Resume saved successfully', {
      ...logContext,
      userId,
      url,
      hasParsedContent: !!content,
    });

    return {
      url,
      fileName,
      content,
      taskId: null, // Synchronous save has no background task
      updatedAt,
    };
  } catch (error) {
    // Clean up the saved file if any subsequent step fails
    if (savedFilePath) {
      try {
        await fs.unlink(savedFilePath);
        logger.info('Cleaned up file after error', {
          ...logContext,
          filePath: savedFilePath,
        });
      } catch (cleanupError) {
        // Ignore cleanup errors - file might not exist
        logger.warn('Failed to clean up file after error', {
          ...logContext,
          filePath: savedFilePath,
          cleanupError: (cleanupError as Error).message,
        });
      }
    }
    throw error;
  }
}

/**
 * Get user's resume data from database
 */
export async function getResume(userId: string): Promise<ResumeData | null> {
  const logContext = { module: 'resume-service', action: 'getResume' };

  logger.info('Fetching resume data', { ...logContext, userId });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      resumeUrl: true,
      resumeFileName: true,
      resumeContent: true,
      resumeUpdatedAt: true,
    },
  });

  if (!user?.resumeUrl) {
    logger.info('No resume found for user', { ...logContext, userId });
    return null;
  }

  let content: ResumeContent | null = null;
  if (user.resumeContent) {
    try {
      content = JSON.parse(user.resumeContent);
    } catch {
      logger.warn('Failed to parse stored resume content', { ...logContext, userId });
    }
  }

  // Check for pending resume parsing task
  let taskId: string | null = null;
  const pendingTask = await prisma.backgroundTask.findFirst({
    where: {
      userId,
      type: 'resume_parsing',
      status: { in: ['pending', 'processing'] },
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  if (pendingTask) {
    taskId = pendingTask.id;
  }

  return {
    url: user.resumeUrl,
    fileName: user.resumeFileName || 'resume',
    content,
    taskId,
    updatedAt: user.resumeUpdatedAt || new Date(),
  };
}

/**
 * Delete user's resume (file and database record)
 */
export async function deleteResume(userId: string): Promise<void> {
  const logContext = { module: 'resume-service', action: 'deleteResume' };

  logger.info('Deleting resume', { ...logContext, userId });

  // Step 1: Delete file from disk
  await deleteResumeFile(userId);

  // Step 2: Clear database fields
  await prisma.user.update({
    where: { id: userId },
    data: {
      resumeUrl: null,
      resumeFileName: null,
      resumeContent: null,
      resumeUpdatedAt: null,
    },
  });

  logger.info('Resume deleted successfully', { ...logContext, userId });
}

/**
 * Re-parse an existing resume file
 * Useful if parsing failed initially or to update parsed content
 */
export async function reparseResume(userId: string): Promise<ResumeContent | null> {
  const logContext = { module: 'resume-service', action: 'reparseResume' };

  logger.info('Re-parsing resume', { ...logContext, userId });

  // Get current resume info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { resumeUrl: true },
  });

  if (!user?.resumeUrl) {
    throw new Error('No resume found for user');
  }

  // getUserResumePath validates userId
  const userDir = getUserResumePath(userId);

  // Find the resume file (try each extension)
  let filePath: string | null = null;
  for (const ext of ALLOWED_EXTENSIONS) {
    const candidatePath = path.join(userDir, `${RESUME_FILENAME}${ext}`);
    try {
      await fs.access(candidatePath);
      filePath = candidatePath;
      break;
    } catch {
      // File doesn't exist with this extension, try next
    }
  }

  if (!filePath) {
    throw new Error('Resume file not found');
  }

  // Parse resume
  const content = await parseResume(filePath);

  // Update database
  await prisma.user.update({
    where: { id: userId },
    data: {
      resumeContent: JSON.stringify(content),
      resumeUpdatedAt: new Date(),
    },
  });

  logger.info('Resume re-parsed successfully', { ...logContext, userId });

  return content;
}

/**
 * Get the file path for a user's resume (for internal use, e.g., serving via API)
 * @param userId - User ID (from authenticated session)
 * @returns File path and mime type, or null if not found
 */
export async function getResumeFilePath(
  userId: string
): Promise<{ filePath: string; mimeType: string } | null> {
  // getUserResumePath validates userId
  const userDir = getUserResumePath(userId);

  // Try each extension to find the file
  for (const ext of ALLOWED_EXTENSIONS) {
    const filePath = path.join(userDir, `${RESUME_FILENAME}${ext}`);
    try {
      await fs.access(filePath);

      // Determine MIME type from extension
      let mimeType: string;
      switch (ext) {
        case '.pdf':
          mimeType = 'application/pdf';
          break;
        case '.jpg':
          mimeType = 'image/jpeg';
          break;
        case '.png':
          mimeType = 'image/png';
          break;
        default:
          mimeType = 'application/octet-stream';
      }

      return { filePath, mimeType };
    } catch {
      // File doesn't exist with this extension, try next
    }
  }

  return null;
}
