/**
 * Shared utilities for queue workers
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/utils/logger';

/**
 * Update task status in database
 */
export async function updateTaskStatus(
  taskId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  updates: {
    progress?: number;
    error?: string | null;
    result?: unknown;
  } = {}
): Promise<void> {
  const logContext = {
    module: 'worker-utils',
    action: 'updateTaskStatus',
    taskId,
    status,
    progress: updates.progress,
    hasError: !!updates.error,
    hasResult: !!updates.result,
  };

  try {
    logger.debug('Updating task status', logContext);

    const updatedTask = await prisma.backgroundTask.update({
      where: { id: taskId },
      data: {
        status,
        progress: updates.progress ?? (status === 'completed' ? 100 : undefined),
        error: updates.error ?? null,
        result: updates.result ?? undefined,
        updatedAt: new Date(),
      },
    });

    logger.info('Task status updated successfully', {
      ...logContext,
      updatedStatus: updatedTask.status,
      updatedProgress: updatedTask.progress,
    });
  } catch (error) {
    logger.error('Failed to update task status', error as Error, logContext);
    throw error;
  }
}
