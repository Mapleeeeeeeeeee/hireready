/**
 * Interview Session API Route
 * GET /api/interview/session
 * Returns Gemini API credentials for authenticated users only
 *
 * Security: API key is only provided to authenticated users
 * and should be used with domain-restricted API keys in production
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { serverEnv } from '@/lib/config/server';
import { jsonSuccess, jsonError } from '@/lib/utils/api-response';
import {
  UnauthorizedError,
  ServiceUnavailableError,
  TooManyRequestsError,
} from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

// ============================================================
// Types
// ============================================================

interface SessionCredentials {
  apiKey: string;
  model: string;
  expiresAt: string;
}

// ============================================================
// Rate Limiting (Simple in-memory implementation)
// ============================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (consider Redis for production)
const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

/**
 * Simple rate limiter - returns true if request should be allowed
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// ============================================================
// Validation
// ============================================================

/**
 * Validate Gemini API key format
 * Gemini API keys are typically 39 characters starting with 'AI'
 */
function isValidApiKeyFormat(apiKey: string): boolean {
  // Basic format validation for Gemini API keys
  return (
    typeof apiKey === 'string' &&
    apiKey.length >= 30 &&
    apiKey.length <= 50 &&
    /^[A-Za-z0-9_-]+$/.test(apiKey)
  );
}

// ============================================================
// Route Handler
// ============================================================

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  logger.info('Interview session credentials requested', {
    module: 'api-interview',
    action: 'session',
    requestId,
    clientIp,
  });

  try {
    // Validate authentication
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      logger.warn('Unauthorized session credentials attempt', {
        module: 'api-interview',
        action: 'session',
        requestId,
        clientIp,
      });
      return jsonError(new UnauthorizedError('Please login to start interview'));
    }

    const userId = session.user.id;

    // Rate limiting check
    if (!checkRateLimit(userId)) {
      logger.warn('Rate limit exceeded for session credentials', {
        module: 'api-interview',
        action: 'session',
        requestId,
        userId,
        clientIp,
      });
      return jsonError(new TooManyRequestsError('Too many requests. Please try again later.'));
    }

    // Check if Gemini API key is configured
    if (!serverEnv.geminiApiKey) {
      logger.error('Gemini API key not configured', new Error('Missing GEMINI_API_KEY'), {
        module: 'api-interview',
        action: 'session',
        requestId,
      });
      return jsonError(new ServiceUnavailableError('Interview service is not configured'));
    }

    // Validate API key format
    if (!isValidApiKeyFormat(serverEnv.geminiApiKey)) {
      logger.error('Invalid Gemini API key format', new Error('Invalid GEMINI_API_KEY format'), {
        module: 'api-interview',
        action: 'session',
        requestId,
      });
      return jsonError(new ServiceUnavailableError('Interview service is misconfigured'));
    }

    // Generate session with expiration (1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Access logging for security audit
    logger.info('Interview session credentials provided', {
      module: 'api-interview',
      action: 'session',
      requestId,
      userId,
      userEmail: session.user.email,
      clientIp,
      expiresAt,
    });

    return jsonSuccess<SessionCredentials>({
      apiKey: serverEnv.geminiApiKey,
      model: 'gemini-2.0-flash-live-001',
      expiresAt,
    });
  } catch (error) {
    logger.error('Failed to get session credentials', error as Error, {
      module: 'api-interview',
      action: 'session',
      requestId,
      clientIp,
    });
    return jsonError(error);
  }
}
