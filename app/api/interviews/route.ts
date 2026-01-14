/**
 * Interviews List API Route
 * GET /api/interviews
 * Returns paginated list of user interviews
 */

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { parsePaginationWithFilters, toPrismaOptions } from '@/lib/utils/pagination';
import { validators } from '@/lib/utils/validation';
import { INTERVIEW_STATUSES, type InterviewStatus } from '@/lib/constants/enums';
import type { InterviewListItem } from '@/lib/types/user';

// ============================================================
// Types
// ============================================================

interface InterviewsListResponse {
  interviews: InterviewListItem[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// Query Parameter Parsing
// ============================================================

interface InterviewFilters {
  status?: InterviewStatus;
}

function parseInterviewFilters(searchParams: URLSearchParams): InterviewFilters {
  const statusParam = searchParams.get('status');
  let status: InterviewStatus | undefined;

  if (statusParam) {
    // Validate status using validators.oneOf
    const result = validators.oneOf('status', INTERVIEW_STATUSES)(statusParam);
    if (result.ok) {
      status = result.value;
    } else {
      throw result.error;
    }
  }

  return { status };
}

// ============================================================
// Route Handler
// ============================================================

async function handleGetInterviews(
  request: Request,
  userId: string
): Promise<InterviewsListResponse> {
  // Parse query parameters using centralized pagination utility
  const { page, limit, filters } = parsePaginationWithFilters(request.url, parseInterviewFilters);
  const { status } = filters;

  // Build where clause
  const where: { userId: string; status?: InterviewStatus } = { userId };
  if (status) {
    where.status = status;
  }

  // Get Prisma pagination options
  const paginationOptions = toPrismaOptions({ page, limit });

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
      ...paginationOptions,
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
