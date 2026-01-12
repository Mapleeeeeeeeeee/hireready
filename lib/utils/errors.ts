/**
 * Custom error types for structured error handling
 * All application errors should extend AppError
 */

// ============================================================
// Error Codes
// ============================================================

/**
 * Error codes for i18n support
 */
export const ERROR_CODES = {
  // Unknown/Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',

  // Client Errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Audio Permission (Client Error)
  AUDIO_PERMISSION_DENIED: 'AUDIO_PERMISSION_DENIED',
  AUDIO_CONTEXT_ERROR: 'AUDIO_CONTEXT_ERROR',

  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_GATEWAY: 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // External Service Errors (Server Errors)
  WEBSOCKET_ERROR: 'WEBSOCKET_ERROR',
  WEBSOCKET_CLOSED: 'WEBSOCKET_CLOSED',
  GEMINI_API_ERROR: 'GEMINI_API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================================
// Base Error Classes
// ============================================================

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly recoverable: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    recoverable: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.recoverable = recoverable;
    this.context = context;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      recoverable: this.recoverable,
      context: this.context,
    };
  }
}

// ============================================================
// Client Errors (4xx)
// ============================================================

/**
 * Base class for client errors (4xx)
 */
export class ClientError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.BAD_REQUEST,
    statusCode: number = 400,
    recoverable: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message, code, statusCode, recoverable, context);
    this.name = 'ClientError';
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends ClientError {
  constructor(message: string = 'Bad request', context?: Record<string, unknown>) {
    super(message, ERROR_CODES.BAD_REQUEST, 400, true, context);
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends ClientError {
  constructor(message: string = 'Unauthorized', context?: Record<string, unknown>) {
    super(message, ERROR_CODES.UNAUTHORIZED, 401, false, context);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends ClientError {
  constructor(message: string = 'Forbidden', context?: Record<string, unknown>) {
    super(message, ERROR_CODES.FORBIDDEN, 403, false, context);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends ClientError {
  constructor(resource: string = 'Resource', context?: Record<string, unknown>) {
    super(`${resource} not found`, ERROR_CODES.NOT_FOUND, 404, true, context);
    this.name = 'NotFoundError';
  }
}

/**
 * 400 Validation Error with field information
 */
export class ValidationError extends ClientError {
  constructor(
    public readonly field: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, true, { ...context, field });
    this.name = 'ValidationError';
  }
}

/**
 * 429 Too Many Requests
 */
export class TooManyRequestsError extends ClientError {
  constructor(message: string = 'Too many requests', context?: Record<string, unknown>) {
    super(message, ERROR_CODES.TOO_MANY_REQUESTS, 429, true, context);
    this.name = 'TooManyRequestsError';
  }
}

// ============================================================
// Server Errors (5xx)
// ============================================================

/**
 * Base class for server errors (5xx)
 */
export class ServerError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.INTERNAL_SERVER_ERROR,
    statusCode: number = 500,
    recoverable: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(message, code, statusCode, recoverable, context);
    this.name = 'ServerError';
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends ServerError {
  constructor(message: string = 'Internal server error', context?: Record<string, unknown>) {
    super(message, ERROR_CODES.INTERNAL_SERVER_ERROR, 500, false, context);
    this.name = 'InternalServerError';
  }
}

/**
 * 502 Bad Gateway
 */
export class BadGatewayError extends ServerError {
  constructor(message: string = 'Bad gateway', context?: Record<string, unknown>) {
    super(message, ERROR_CODES.BAD_GATEWAY, 502, true, context);
    this.name = 'BadGatewayError';
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends ServerError {
  constructor(message: string = 'Service unavailable', context?: Record<string, unknown>) {
    super(message, ERROR_CODES.SERVICE_UNAVAILABLE, 503, true, context);
    this.name = 'ServiceUnavailableError';
  }
}

// ============================================================
// Specific Error Types
// ============================================================

/**
 * Thrown when microphone permission is denied
 */
export class AudioPermissionError extends ClientError {
  constructor(originalError?: Error) {
    super(
      'Microphone permission denied. Please allow microphone access to continue.',
      ERROR_CODES.AUDIO_PERMISSION_DENIED,
      403,
      true,
      { originalError: originalError?.message }
    );
    this.name = 'AudioPermissionError';
  }
}

/**
 * Thrown when AudioContext fails to initialize or operate
 */
export class AudioContextError extends ClientError {
  constructor(reason: string) {
    super(`Audio context error: ${reason}`, ERROR_CODES.AUDIO_CONTEXT_ERROR, 400, true, { reason });
    this.name = 'AudioContextError';
  }
}

/**
 * Thrown when WebSocket connection fails or encounters an error
 */
export class WebSocketError extends ServerError {
  constructor(reason: string, statusCode?: number) {
    super(`WebSocket error: ${reason}`, ERROR_CODES.WEBSOCKET_ERROR, 502, true, {
      reason,
      statusCode,
    });
    this.name = 'WebSocketError';
  }
}

/**
 * Thrown when WebSocket connection is closed unexpectedly
 */
export class WebSocketClosedError extends ServerError {
  constructor(code: number, reason: string) {
    super(
      `WebSocket closed: ${reason} (code: ${code})`,
      ERROR_CODES.WEBSOCKET_CLOSED,
      502,
      code !== 1000, // Normal closure is not recoverable
      { code, reason }
    );
    this.name = 'WebSocketClosedError';
  }
}

/**
 * Thrown when Gemini API returns an error
 */
export class GeminiAPIError extends ServerError {
  constructor(message: string, apiStatusCode?: number, details?: unknown) {
    super(
      `Gemini API error: ${message}`,
      ERROR_CODES.GEMINI_API_ERROR,
      502,
      apiStatusCode !== 401 && apiStatusCode !== 403, // Auth errors are not recoverable
      { apiStatusCode, details }
    );
    this.name = 'GeminiAPIError';
  }
}

/**
 * Thrown when network request fails
 */
export class NetworkError extends ServerError {
  constructor(reason: string, statusCode?: number) {
    super(`Network error: ${reason}`, ERROR_CODES.NETWORK_ERROR, 502, true, { reason, statusCode });
    this.name = 'NetworkError';
  }
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is a ClientError
 */
export function isClientError(error: unknown): error is ClientError {
  return error instanceof ClientError;
}

/**
 * Type guard to check if an error is a ServerError
 */
export function isServerError(error: unknown): error is ServerError {
  return error instanceof ServerError;
}

/**
 * Convert any error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message, {
      originalName: error.name,
      stack: error.stack,
    });
  }

  return new InternalServerError(typeof error === 'string' ? error : 'An unknown error occurred', {
    originalError: error,
  });
}

// ============================================================
// Backward Compatibility Aliases (for existing code)
// ============================================================

/**
 * @deprecated Use UnauthorizedError instead
 */
export class AuthError extends UnauthorizedError {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthError';
  }
}
