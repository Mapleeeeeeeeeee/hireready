/**
 * Interviews List API Route
 * GET /api/interviews
 * Returns paginated list of user interviews
 */

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';

// ============================================================
// Types
// ============================================================

interface InterviewListItem {
  id: string;
  scenario: string;
  status: string;
  score: number | null;
  duration: number | null;
  feedback: string | null;
  strengths: string[];
  improvements: string[];
  createdAt: string;
  updatedAt: string;
}

interface InterviewsListResponse {
  interviews: InterviewListItem[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// Query Parameter Parsing
// ============================================================

interface QueryParams {
  page: number;
  limit: number;
  status?: string;
}

function parseQueryParams(url: string): QueryParams {
  const urlObj = new URL(url);
  const searchParams = urlObj.searchParams;

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));
  const status = searchParams.get('status') || undefined;

  return { page, limit, status };
}

// ============================================================
// Route Handler
// ============================================================

async function handleGetInterviews(
  request: Request,
  userId: string
): Promise<InterviewsListResponse> {
  // Parse query parameters
  const { page, limit, status } = parseQueryParams(request.url);

  // Validate status if provided
  const validStatuses = ['pending', 'in_progress', 'completed'];
  if (status && !validStatuses.includes(status)) {
    throw new ValidationError(
      'status',
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    );
  }

  // Build where clause
  const where: { userId: string; status?: string } = { userId };
  if (status) {
    where.status = status;
  }

  // Fetch total count and paginated interviews
  const [total, interviews] = await Promise.all([
    prisma.interview.count({ where }),
    prisma.interview.findMany({
      where,
      select: {
        id: true,
        scenario: true,
        status: true,
        score: true,
        duration: true,
        feedback: true,
        strengths: true,
        improvements: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Transform to response format
  const interviewsList: InterviewListItem[] = interviews.map((i) => ({
    id: i.id,
    scenario: i.scenario,
    status: i.status,
    score: i.score,
    duration: i.duration,
    feedback: i.feedback,
    strengths: i.strengths,
    improvements: i.improvements,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }));

  return {
    interviews: interviewsList,
    total,
    page,
    limit,
  };
}

export const GET = withAuthHandler(handleGetInterviews, {
  module: 'api-interviews',
  action: 'list',
});
