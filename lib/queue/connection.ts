/**
 * Redis connection singleton for BullMQ
 */

import Redis from 'ioredis';

import { serverEnv } from '@/lib/config/server';
import { logger } from '@/lib/utils/logger';

// Use global to prevent HMR from creating multiple connections
const globalForRedis = global as unknown as {
  redisConnection: Redis | undefined;
};

/**
 * Get or create a Redis connection singleton
 * Uses lazy initialization to avoid connection issues during build time
 */
export function getRedisConnection(): Redis {
  if (!globalForRedis.redisConnection) {
    const redisUrl = serverEnv.redisUrl;

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required for queue operations');
    }

    globalForRedis.redisConnection = new Redis(redisUrl, {
      // Required for BullMQ - prevents blocking behavior
      maxRetriesPerRequest: null,
      // Enable offline queue to buffer commands when disconnected
      enableOfflineQueue: true,
      // Reconnect strategy
      retryStrategy: (times: number) => {
        if (times > 10) {
          // Stop retrying after 10 attempts
          return null;
        }
        // Exponential backoff with max 30 seconds
        return Math.min(times * 1000, 30000);
      },
    });

    globalForRedis.redisConnection.on('error', (error) => {
      logger.error('Redis connection error', error, {
        module: 'queue',
        action: 'redis_connection',
      });
    });

    globalForRedis.redisConnection.on('connect', () => {
      logger.info('Redis connected successfully', {
        module: 'queue',
        action: 'redis_connection',
      });
    });

    globalForRedis.redisConnection.on('reconnecting', () => {
      logger.info('Redis reconnecting...', {
        module: 'queue',
        action: 'redis_reconnect',
      });
    });
  }

  return globalForRedis.redisConnection;
}

/**
 * Close the Redis connection
 * Should be called during graceful shutdown
 */
export async function closeRedisConnection(): Promise<void> {
  if (globalForRedis.redisConnection) {
    await globalForRedis.redisConnection.quit();
    globalForRedis.redisConnection = undefined;
    logger.info('Redis connection closed', {
      module: 'queue',
      action: 'redis_close',
    });
  }
}

/**
 * Check if Redis connection is available (synchronous check)
 * Only checks if REDIS_URL is configured, does not test actual connection
 * Logs the status for debugging purposes
 */
export function isRedisAvailable(): boolean {
  const redisUrl = serverEnv.redisUrl;
  const isAvailable = !!redisUrl;

  if (!isAvailable) {
    logger.warn('Redis URL not configured - queue features disabled', {
      module: 'queue',
      action: 'redis_check',
      hint: 'Set REDIS_URL environment variable to enable background job processing',
    });
  } else {
    logger.debug('Redis URL configured', {
      module: 'queue',
      action: 'redis_check',
      // Log only the host part for security (no password)
      redisHost: redisUrl.includes('@')
        ? redisUrl.split('@')[1]?.split('/')[0]
        : redisUrl.replace(/^redis:\/\//, '').split('/')[0],
    });
  }

  return isAvailable;
}

/**
 * Test Redis connection by performing a PING command
 * Use this for health checks or startup validation
 * @returns Promise<boolean> - true if connection is successful
 */
export async function testRedisConnection(): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const connection = getRedisConnection();
    const result = await connection.ping();
    const isConnected = result === 'PONG';

    logger.info('Redis connection test', {
      module: 'queue',
      action: 'redis_ping',
      success: isConnected,
    });

    return isConnected;
  } catch (error) {
    logger.error('Redis connection test failed', error as Error, {
      module: 'queue',
      action: 'redis_ping',
    });
    return false;
  }
}
