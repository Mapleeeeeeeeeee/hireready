/**
 * Unit tests for apiClient
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiGet, apiPost, apiPut, apiDelete } from './api-client';
import type { ApiSuccessResponse, ApiErrorResponse } from './api-response';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  ValidationError,
  ServiceUnavailableError,
  InternalServerError,
} from './errors';

// ============================================================
// Test Helpers
// ============================================================

function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

function createErrorResponse(code: string, message: string, field?: string): ApiErrorResponse {
  return {
    success: false,
    data: null,
    error: {
      // Cast is safe in tests where we control the input
      code: code as ApiErrorResponse['error']['code'],
      message,
      field,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================================
// Tests
// ============================================================

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apiGet', () => {
    it('should return data on success', async () => {
      const mockData = { id: '123', name: 'Test' };
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => createSuccessResponse(mockData),
      });

      const result = await apiGet('/api/test', { fetchFn: mockFetch });

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    it('should throw UnauthorizedError on 401', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 401,
        json: async () => createErrorResponse('UNAUTHORIZED', 'Please login'),
      });

      await expect(apiGet('/api/test', { fetchFn: mockFetch })).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ForbiddenError on 403', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 403,
        json: async () => createErrorResponse('FORBIDDEN', 'Access denied'),
      });

      await expect(apiGet('/api/test', { fetchFn: mockFetch })).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError on 404', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 404,
        json: async () => createErrorResponse('NOT_FOUND', 'Resource not found'),
      });

      await expect(apiGet('/api/test', { fetchFn: mockFetch })).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError on 400', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 400,
        json: async () => createErrorResponse('BAD_REQUEST', 'Invalid request'),
      });

      await expect(apiGet('/api/test', { fetchFn: mockFetch })).rejects.toThrow(BadRequestError);
    });

    it('should throw ValidationError on VALIDATION_ERROR', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 400,
        json: async () => createErrorResponse('VALIDATION_ERROR', 'Email is required', 'email'),
      });

      await expect(apiGet('/api/test', { fetchFn: mockFetch })).rejects.toThrow(ValidationError);
    });

    it('should throw ServiceUnavailableError on timeout', async () => {
      const mockFetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        });
      });

      // Mock error name
      const error = new Error('AbortError');
      error.name = 'AbortError';
      mockFetch.mockRejectedValue(error);

      await expect(apiGet('/api/test', { fetchFn: mockFetch, timeout: 50 })).rejects.toThrow(
        ServiceUnavailableError
      );
    });

    it('should throw BadGatewayError on malformed JSON response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });

      await expect(apiGet('/api/test', { fetchFn: mockFetch })).rejects.toThrow(
        'Invalid JSON response from server (status: 502)'
      );
    });

    it('should handle network failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network request failed'));

      await expect(apiGet('/api/test', { fetchFn: mockFetch })).rejects.toThrow(
        InternalServerError
      );
    });

    it('should handle HTML error page response (503 with HTML)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 503,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      });

      await expect(apiGet('/api/test', { fetchFn: mockFetch })).rejects.toThrow(
        'Invalid JSON response from server (status: 503)'
      );
    });
  });

  describe('apiPost', () => {
    it('should send POST request with body', async () => {
      const mockData = { id: '123' };
      const requestBody = { name: 'Test' };
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => createSuccessResponse(mockData),
      });

      const result = await apiPost('/api/test', requestBody, { fetchFn: mockFetch });

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should throw InternalServerError on 500', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 500,
        json: async () => createErrorResponse('INTERNAL_SERVER_ERROR', 'Server error'),
      });

      await expect(apiPost('/api/test', {}, { fetchFn: mockFetch })).rejects.toThrow(
        InternalServerError
      );
    });
  });

  describe('apiPut', () => {
    it('should send PUT request with body', async () => {
      const mockData = { id: '123', updated: true };
      const requestBody = { name: 'Updated' };
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => createSuccessResponse(mockData),
      });

      const result = await apiPut('/api/test', requestBody, { fetchFn: mockFetch });

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestBody),
        })
      );
    });
  });

  describe('apiDelete', () => {
    it('should send DELETE request', async () => {
      const mockData = { deleted: true };
      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => createSuccessResponse(mockData),
      });

      const result = await apiDelete('/api/test', { fetchFn: mockFetch });

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});
