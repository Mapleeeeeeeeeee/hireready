/**
 * Resume File Access API Route
 * GET /api/resume/file
 * Serves resume files with authentication - files are stored privately
 */

import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { getResumeFilePath } from '@/lib/resume';
import { logger } from '@/lib/utils/logger';
import { CommonResponses } from '@/lib/utils/api-response';

// ============================================================
// Route Handler
// ============================================================

export async function GET(request: Request): Promise<NextResponse> {
  const logContext = { module: 'api-resume-file', action: 'get' };

  try {
    // Authenticate user
    const userId = await requireAuth(request);

    logger.info('Resume file access requested', { ...logContext, userId });

    // Get the file path for this user's resume
    const fileInfo = await getResumeFilePath(userId);

    if (!fileInfo) {
      logger.info('Resume file not found', { ...logContext, userId });
      return CommonResponses.notFound('Resume');
    }

    const { filePath, mimeType } = fileInfo;

    // Read the file
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(filePath);
    } catch (error) {
      logger.error('Failed to read resume file', error as Error, {
        ...logContext,
        userId,
        filePath,
      });
      return CommonResponses.notFound('Resume file');
    }

    logger.info('Resume file served successfully', {
      ...logContext,
      userId,
      mimeType,
      fileSize: fileBuffer.length,
    });

    // Return the file with appropriate headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return CommonResponses.unauthorized();
    }

    logger.error('Unexpected error serving resume file', error as Error, logContext);
    return CommonResponses.serverError();
  }
}
