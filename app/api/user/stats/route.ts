/**
 * User Stats API Route
 * GET /api/user/stats
 * Returns user interview statistics
 */

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';

// ============================================================
// Response Types
// ============================================================

interface RecentInterview {
  id: string;
  scenario: string;
  status: string;
  score: number | null;
  duration: number | null;
  createdAt: string;
}

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
  // Fetch all user interviews
  const interviews = await prisma.interview.findMany({
    where: { userId },
    select: {
      id: true,
      scenario: true,
      status: true,
      score: true,
      duration: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate statistics
  const totalInterviews = interviews.length;
  const completedInterviews = interviews.filter((i) => i.status === 'completed').length;

  // Calculate average score (only from completed interviews with scores)
  const scoresArray = interviews.filter((i) => i.score !== null).map((i) => i.score as number);
  const averageScore =
    scoresArray.length > 0
      ? Math.round(scoresArray.reduce((sum, score) => sum + score, 0) / scoresArray.length)
      : null;

  // Calculate total practice minutes (sum of all durations in seconds, convert to minutes)
  const totalDurationSeconds = interviews
    .filter((i) => i.duration !== null)
    .reduce((sum, i) => sum + (i.duration as number), 0);
  const totalPracticeMinutes = Math.round(totalDurationSeconds / 60);

  // Get recent interviews (top 5)
  const recentInterviews: RecentInterview[] = interviews.slice(0, 5).map((i) => ({
    id: i.id,
    scenario: i.scenario,
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
    recentInterviews,
  };
}

export const GET = withAuthHandler(handleGetStats, {
  module: 'api-user',
  action: 'stats',
});
