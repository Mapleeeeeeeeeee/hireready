/**
 * Task Polling API Route
 * GET /api/tasks/[taskId] - Get task status for polling
 */

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { verifyOwnership, extractResourceId } from '@/lib/utils/resource-helpers';
import { logger } from '@/lib/utils/logger';
import type { TaskStatus, TaskType } from '@/lib/queue/types';

// ============================================================
// Types
// ============================================================

interface TaskResponse {
  id: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  resourceId: string | null;
  error: string | null;
  result: unknown;
}

// ============================================================
// GET Handler - Get Task Status
// ============================================================

async function handleGetTask(request: Request, userId: string): Promise<TaskResponse> {
  const taskId = extractResourceId(request.url, 'Task');

  logger.info('Polling task status', {
    module: 'api-tasks',
    action: 'poll',
    taskId,
    userId,
  });

  // Fetch task
  const rawTask = await prisma.backgroundTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      userId: true,
      type: true,
      status: true,
      progress: true,
      resourceId: true,
      error: true,
      result: true,
    },
  });

  // Verify existence and ownership
  const task = verifyOwnership(rawTask, userId, 'Task');

  return {
    id: task.id,
    type: task.type as TaskType,
    status: task.status as TaskStatus,
    progress: task.progress,
    resourceId: task.resourceId,
    error: task.error,
    result: task.result,
  };
}

export const GET = withAuthHandler(handleGetTask, {
  module: 'api-tasks',
  action: 'get-status',
});
