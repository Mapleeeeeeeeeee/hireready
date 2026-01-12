/**
 * API Envelope Response utilities
 * Provides consistent API response format across all endpoints
 */

import { NextResponse } from 'next/server';
import { serverEnv } from '@/lib/config/server';
import { AppError, isAppError, toAppError, ErrorCode } from './errors';
import { logger, LogContext } from './logger';
import { Result } from './result';

// ============================================================
// Envelope Response Types
// ============================================================

/**
 * Standard API success response envelope
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  meta?: ResponseMeta;
}

/**
 * Standard API error response envelope
 */
export interface ApiErrorResponse {
  success: false;
  data: null;
  error: {
    code: ErrorCode;
    message: string;
    field?: string; // For validation errors
    details?: unknown;
  };
  meta?: ResponseMeta;
}

/**
 * Combined API response type
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Response metadata
 */
export interface ResponseMeta {
  requestId?: string;
  timestamp: string;
  duration?: number;
}

// ============================================================
// Response Builders
// ============================================================

/**
 * Create a success response envelope
 */
export function successResponse<T>(data: T, meta?: Partial<ResponseMeta>): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create an error response envelope
 */
export function errorResponse(error: AppError, meta?: Partial<ResponseMeta>): ApiErrorResponse {
  return {
    success: false,
    data: null,
    error: {
      code: error.code,
      message: error.message,
      field: (error as { field?: string }).field,
      details: serverEnv.nodeEnv === 'development' ? error.context : undefined,
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

// ============================================================
// NextResponse Helpers
// ============================================================

/**
 * HTTP status codes for different error types
 * @deprecated Status codes are now managed by the error classes themselves
 */
const errorStatusMap: Record<ErrorCode, number> = {
  // Unknown/Generic
  UNKNOWN_ERROR: 500,

  // Client Errors (4xx)
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  TOO_MANY_REQUESTS: 429,

  // Audio Permission (Client Error)
  AUDIO_PERMISSION_DENIED: 403,
  AUDIO_CONTEXT_ERROR: 400,

  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,

  // External Service Errors (Server Errors)
  WEBSOCKET_ERROR: 502,
  WEBSOCKET_CLOSED: 502,
  GEMINI_API_ERROR: 502,
  NETWORK_ERROR: 502,
};

/**
 * Create NextResponse with success envelope
 */
export function jsonSuccess<T>(
  data: T,
  options?: { status?: number; meta?: Partial<ResponseMeta> }
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(successResponse(data, options?.meta), {
    status: options?.status ?? 200,
  });
}

/**
 * Create NextResponse with error envelope
 */
export function jsonError(
  error: AppError | Error | unknown,
  options?: { status?: number; meta?: Partial<ResponseMeta> }
): NextResponse<ApiErrorResponse> {
  const appError = isAppError(error) ? error : toAppError(error);
  // Use error's statusCode if available, otherwise fall back to options or map
  const status = options?.status ?? appError.statusCode ?? errorStatusMap[appError.code] ?? 500;

  return NextResponse.json(errorResponse(appError, options?.meta), {
    status,
  });
}

/**
 * Create NextResponse from Result type
 */
export function jsonResult<T>(
  result: Result<T>,
  options?: {
    successStatus?: number;
    meta?: Partial<ResponseMeta>;
  }
): NextResponse<ApiResponse<T>> {
  if (result.ok) {
    return jsonSuccess(result.value, {
      status: options?.successStatus ?? 200,
      meta: options?.meta,
    });
  }
  return jsonError(result.error, { meta: options?.meta });
}

// ============================================================
// API Handler Wrapper (HOF)
// ============================================================

export interface ApiHandlerOptions {
  module: string;
  action: string;
}

type NextHandler<T> = (request: Request) => Promise<T>;

/**
 * HOF: Wrap API route handler with unified error handling and logging
 */
export function withApiHandler<T>(
  handler: NextHandler<T>,
  options: ApiHandlerOptions
): NextHandler<NextResponse<ApiResponse<T>>> {
  return async (request: Request) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    const logContext: LogContext = {
      module: options.module,
      action: options.action,
      requestId,
      method: request.method,
      url: request.url,
    };

    logger.info(`API request started`, logContext);

    try {
      const result = await handler(request);
      const duration = Date.now() - startTime;

      logger.info(`API request completed`, {
        ...logContext,
        durationMs: duration,
      });

      return jsonSuccess(result, {
        meta: { requestId, timestamp: new Date().toISOString(), duration },
      });
    } catch (error) {
      const appError = toAppError(error);
      const duration = Date.now() - startTime;

      logger.error(`API request failed`, appError, {
        ...logContext,
        durationMs: duration,
      });

      return jsonError(appError, {
        meta: { requestId, timestamp: new Date().toISOString(), duration },
      });
    }
  };
}

/**
 * HOF: Wrap API route handler that returns Result<T>
 */
export function withResultHandler<T>(
  handler: NextHandler<Result<T>>,
  options: ApiHandlerOptions
): NextHandler<NextResponse<ApiResponse<T>>> {
  return async (request: Request) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    const logContext: LogContext = {
      module: options.module,
      action: options.action,
      requestId,
      method: request.method,
      url: request.url,
    };

    logger.info(`API request started`, logContext);

    try {
      const result = await handler(request);
      const duration = Date.now() - startTime;

      if (result.ok) {
        logger.info(`API request completed`, {
          ...logContext,
          durationMs: duration,
        });
      } else {
        logger.warn(`API request returned error`, {
          ...logContext,
          durationMs: duration,
          errorCode: result.error.code,
        });
      }

      return jsonResult(result, {
        meta: { requestId, timestamp: new Date().toISOString(), duration },
      });
    } catch (error) {
      const appError = toAppError(error);
      const duration = Date.now() - startTime;

      logger.error(`API request failed unexpectedly`, appError, {
        ...logContext,
        durationMs: duration,
      });

      return jsonError(appError, {
        meta: { requestId, timestamp: new Date().toISOString(), duration },
      });
    }
  };
}

// ============================================================
// Common Responses
// ============================================================

/* eslint-disable @typescript-eslint/no-require-imports */
// Using require() to avoid circular dependency with errors.ts
export const CommonResponses = {
  unauthorized: (message?: string) => {
    const { UnauthorizedError } = require('./errors');
    return jsonError(new UnauthorizedError(message));
  },

  forbidden: (message?: string) => {
    const { ForbiddenError } = require('./errors');
    return jsonError(new ForbiddenError(message));
  },

  notFound: (resource?: string) => {
    const { NotFoundError } = require('./errors');
    return jsonError(new NotFoundError(resource));
  },

  badRequest: (message: string) => {
    const { BadRequestError } = require('./errors');
    return jsonError(new BadRequestError(message));
  },

  serverError: (message?: string) => {
    const { InternalServerError } = require('./errors');
    return jsonError(new InternalServerError(message));
  },
};
/* eslint-enable @typescript-eslint/no-require-imports */
