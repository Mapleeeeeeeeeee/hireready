/**
 * JD Parse API Route
 * POST /api/jd/parse
 * Parses job description from URL or text input
 */

import { withApiHandler } from '@/lib/utils/api-response';
import { validators } from '@/lib/utils/validation';
import { Ok, Err, Result } from '@/lib/utils/result';
import { ValidationError, BadRequestError } from '@/lib/utils/errors';
import { parseJsonBody } from '@/lib/utils/resource-helpers';
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

async function handleParseJD(request: Request): Promise<JDParseResponse> {
  // Parse and validate request body
  const body = await parseJsonBody<unknown>(request);
  const validationResult = validateJDParseInput(body);

  if (!validationResult.ok) {
    throw validationResult.error;
  }

  const { type, content, title } = validationResult.value;

  // Parse job description based on input type
  const parseResult: Result<JobDescription> =
    type === 'url' ? await parseJobFromUrl(content) : parseJobFromText(content, title);

  if (!parseResult.ok) {
    throw parseResult.error;
  }

  return {
    jobDescription: parseResult.value,
  };
}

export const POST = withApiHandler(handleParseJD, {
  module: 'api-jd',
  action: 'parse',
});
