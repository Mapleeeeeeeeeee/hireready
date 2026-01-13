/**
 * JD Parse API Route
 * POST /api/jd/parse
 * Parses job description from URL or text input
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/utils/api-response';
import { validators } from '@/lib/utils/validation';
import { Ok, Err, Result } from '@/lib/utils/result';
import { ValidationError, BadRequestError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import { parseJobFromUrl, parseJobFromText } from '@/lib/jd/jd-service';
import type { JobDescription } from '@/lib/jd/types';

// ============================================================
// Request Validation
// ============================================================

type ParseInputType = 'url' | 'text';

interface JDParseInput {
  type: ParseInputType;
  content: string;
  title?: string;
}

function validateJDParseInput(
  body: unknown
): Result<JDParseInput, ValidationError | BadRequestError> {
  if (typeof body !== 'object' || body === null) {
    return Err(new BadRequestError('Invalid request body'));
  }

  const data = body as Record<string, unknown>;

  // Validate type
  const typeResult = validators.oneOf('type', ['url', 'text'] as const)(data.type);
  if (!typeResult.ok) return typeResult;

  // Validate content
  const contentResult = validators.nonEmpty('content')(data.content);
  if (!contentResult.ok) return contentResult;

  // Validate title (optional)
  const titleResult = validators.optional(validators.string('title'))(data.title);
  if (!titleResult.ok) return titleResult;

  // Additional validation based on type
  if (typeResult.value === 'url') {
    // Validate URL format
    try {
      new URL(contentResult.value);
    } catch {
      return Err(new ValidationError('content', 'Invalid URL format'));
    }
  }

  return Ok({
    type: typeResult.value,
    content: contentResult.value,
    title: titleResult.value,
  });
}

// ============================================================
// Response Types
// ============================================================

interface JDParseResponse {
  jobDescription: JobDescription;
}

// ============================================================
// Route Handler
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  logger.info('JD parse request started', {
    module: 'api-jd',
    action: 'parse',
    requestId,
  });

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = validateJDParseInput(body);

    if (!validationResult.ok) {
      logger.warn('JD parse validation failed', {
        module: 'api-jd',
        action: 'parse',
        requestId,
        error: validationResult.error.message,
      });
      return jsonError(validationResult.error);
    }

    const { type, content, title } = validationResult.value;

    // Parse job description based on input type
    let parseResult: Result<JobDescription>;

    if (type === 'url') {
      logger.info('Parsing JD from URL', {
        module: 'api-jd',
        action: 'parse',
        requestId,
        url: content,
      });
      parseResult = await parseJobFromUrl(content);
    } else {
      logger.info('Parsing JD from text', {
        module: 'api-jd',
        action: 'parse',
        requestId,
        hasTitle: Boolean(title),
      });
      parseResult = parseJobFromText(content, title);
    }

    if (!parseResult.ok) {
      const durationMs = Date.now() - startTime;
      logger.warn('JD parse failed', {
        module: 'api-jd',
        action: 'parse',
        requestId,
        durationMs,
        error: parseResult.error.message,
      });
      return jsonError(parseResult.error);
    }

    const durationMs = Date.now() - startTime;
    logger.info('JD parse completed successfully', {
      module: 'api-jd',
      action: 'parse',
      requestId,
      durationMs,
      source: parseResult.value.source,
      title: parseResult.value.title,
    });

    return jsonSuccess<JDParseResponse>({
      jobDescription: parseResult.value,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('JD parse request failed', error as Error, {
      module: 'api-jd',
      action: 'parse',
      requestId,
      durationMs,
    });
    return jsonError(error);
  }
}
