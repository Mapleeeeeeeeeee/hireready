/**
 * User Stats API Route
 * GET /api/user/stats
 * Returns user interview statistics
 */

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import type { RecentInterview } from '@/lib/types/user';

// ============================================================
// Response Types
// ============================================================

interface UserStatsResponse {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number | null;
  totalPracticeMinutes: number;
  recentInterviews: RecentInterview[];
}

// ============================================================
// Route Handler
// ============================================================

async function handleGetStats(request: Request, userId: string): Promise<UserStatsResponse> {
  // Use Prisma aggregation for efficient database queries
  const [aggregates, completedCount, recentInterviews] = await Promise.all([
    prisma.interview.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { duration: true },
      _avg: { score: true },
    }),
    prisma.interview.count({
      where: { userId, status: 'completed' },
    }),
    prisma.interview.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        score: true,
        duration: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // Extract aggregated values
  const totalInterviews = aggregates._count.id;
  const completedInterviews = completedCount;
  const averageScore = aggregates._avg.score !== null ? Math.round(aggregates._avg.score) : null;
  const totalPracticeMinutes =
    aggregates._sum.duration !== null ? Math.round(aggregates._sum.duration / 60) : 0;

  // Transform recent interviews to response format
  const recentInterviewsList: RecentInterview[] = recentInterviews.map((i) => ({
    id: i.id,
    status: i.status,
    score: i.score,
    duration: i.duration,
    createdAt: i.createdAt.toISOString(),
  }));

  return {
    totalInterviews,
    completedInterviews,
    averageScore,
    totalPracticeMinutes,
    recentInterviews: recentInterviewsList,
  };
}

export const GET = withAuthHandler(handleGetStats, {
  module: 'api-user',
  action: 'stats',
});
