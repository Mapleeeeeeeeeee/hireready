/**
 * API Client for frontend HTTP requests
 * Provides a lightweight wrapper around fetch with:
 * - Automatic ApiResponse envelope handling
 * - Error parsing and AppError throwing
 * - Type-safe responses
 * - Consistent configuration (credentials, headers)
 */

'use client';

import type { ApiResponse } from './api-response';
import {
  toAppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  ValidationError,
  ServiceUnavailableError,
  BadGatewayError,
  InternalServerError,
  type ErrorCode,
} from './errors';

// ============================================================
// Types
// ============================================================

interface ApiClientOptions {
  /** Additional headers to merge with defaults */
  headers?: HeadersInit;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Custom fetch function (for testing) */
  fetchFn?: typeof fetch;
}

// ============================================================
// Error Mapping
// ============================================================

/**
 * Convert API error response to appropriate AppError
 */
function createErrorFromResponse(
  errorCode: ErrorCode,
  message: string,
  statusCode: number,
  field?: string
): Error {
  // Map error codes to specific error classes
  switch (errorCode) {
    case 'UNAUTHORIZED':
      return new UnauthorizedError(message);
    case 'FORBIDDEN':
    case 'AUDIO_PERMISSION_DENIED':
      return new ForbiddenError(message);
    case 'NOT_FOUND':
      return new NotFoundError(message);
    case 'BAD_REQUEST':
      return new BadRequestError(message);
    case 'VALIDATION_ERROR':
      return new ValidationError(field ?? 'unknown', message);
    case 'SERVICE_UNAVAILABLE':
      return new ServiceUnavailableError(message);
    case 'BAD_GATEWAY':
    case 'WEBSOCKET_ERROR':
    case 'WEBSOCKET_CLOSED':
    case 'GEMINI_API_ERROR':
    case 'NETWORK_ERROR':
      return new BadGatewayError(message);
    case 'INTERNAL_SERVER_ERROR':
      return new InternalServerError(message);
    default:
      return new InternalServerError(message);
  }
}

// ============================================================
// Core API Client
// ============================================================

/**
 * Parse API response and throw on error
 */
async function handleResponse<T>(response: Response): Promise<T> {
  try {
    // Parse JSON
    const json: ApiResponse<T> = await response.json();

    // Success case
    if (json.success) {
      return json.data;
    }

    // Error case: throw appropriate AppError
    const error = createErrorFromResponse(
      json.error.code,
      json.error.message,
      response.status,
      json.error.field
    );

    throw error;
  } catch (error) {
    // JSON parse failed or malformed response
    if (error instanceof SyntaxError) {
      throw new BadGatewayError(`Invalid JSON response from server (status: ${response.status})`);
    }
    // Re-throw if it's already an AppError from createErrorFromResponse
    throw error;
  }
}

/**
 * Core request function shared by all HTTP methods
 */
async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  options?: ApiClientOptions & { body?: unknown }
): Promise<T> {
  const fetchFn = options?.fetchFn ?? fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? 30000);

  try {
    const init: RequestInit = {
      method,
      credentials: 'include',
      headers: { ...options?.headers },
      signal: controller.signal,
    };

    // Add body for POST/PUT requests
    if (options?.body && (method === 'POST' || method === 'PUT')) {
      init.headers = {
        'Content-Type': 'application/json',
        ...init.headers,
      };
      init.body = JSON.stringify(options.body);
    }

    const response = await fetchFn(url, init);
    return await handleResponse<T>(response);
  } catch (error) {
    // Handle AbortError
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ServiceUnavailableError('Request timeout');
    }
    throw toAppError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * GET request
 */
export async function apiGet<T>(url: string, options?: ApiClientOptions): Promise<T> {
  return apiRequest<T>('GET', url, options);
}

/**
 * POST request
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
  options?: ApiClientOptions
): Promise<T> {
  return apiRequest<T>('POST', url, { ...options, body });
}

/**
 * PUT request
 */
export async function apiPut<T>(
  url: string,
  body: unknown,
  options?: ApiClientOptions
): Promise<T> {
  return apiRequest<T>('PUT', url, { ...options, body });
}

/**
 * DELETE request
 */
export async function apiDelete<T>(url: string, options?: ApiClientOptions): Promise<T> {
  return apiRequest<T>('DELETE', url, options);
}

/**
 * POST request with FormData (for file uploads)
 * Note: Does not set Content-Type header - browser will set it with proper boundary
 */
export async function apiPostFormData<T>(
  url: string,
  formData: FormData,
  options?: ApiClientOptions
): Promise<T> {
  const fetchFn = options?.fetchFn ?? fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? 30000);

  try {
    const response = await fetchFn(url, {
      method: 'POST',
      credentials: 'include',
      headers: { ...options?.headers },
      body: formData,
      signal: controller.signal,
    });
    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ServiceUnavailableError('Request timeout');
    }
    throw toAppError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================
// Default Export (Optional)
// ============================================================

export const apiClient = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  postFormData: apiPostFormData,
};
