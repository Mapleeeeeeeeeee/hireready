/**
 * Unit tests for Result type utilities
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import {
  Ok,
  Err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  withErrorHandling,
  withRetry,
  withSafeRetry,
} from './result';
import { AppError, BadRequestError } from './errors';

describe('Result Type', () => {
  describe('Ok', () => {
    it('should create a success result', () => {
      const result = Ok(42);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('should handle complex values', () => {
      const data = { name: 'test', items: [1, 2, 3] };
      const result = Ok(data);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(data);
      }
    });
  });

  describe('Err', () => {
    it('should create an error result', () => {
      const error = new BadRequestError('Invalid input');
      const result = Err(error);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('isOk', () => {
    it('should return true for Ok results', () => {
      expect(isOk(Ok(1))).toBe(true);
    });

    it('should return false for Err results', () => {
      expect(isOk(Err(new BadRequestError('test')))).toBe(false);
    });
  });

  describe('isErr', () => {
    it('should return true for Err results', () => {
      expect(isErr(Err(new BadRequestError('test')))).toBe(true);
    });

    it('should return false for Ok results', () => {
      expect(isErr(Ok(1))).toBe(false);
    });
  });

  describe('unwrap', () => {
    it('should return value for Ok results', () => {
      expect(unwrap(Ok(42))).toBe(42);
    });

    it('should throw for Err results', () => {
      const error = new BadRequestError('test');
      expect(() => unwrap(Err(error))).toThrow(error);
    });
  });

  describe('unwrapOr', () => {
    it('should return value for Ok results', () => {
      expect(unwrapOr(Ok(42), 0)).toBe(42);
    });

    it('should return default for Err results', () => {
      expect(unwrapOr(Err(new BadRequestError('test')), 0)).toBe(0);
    });
  });
});

describe('Higher-Order Functions', () => {
  describe('withErrorHandling', () => {
    it('should wrap successful function in Ok', async () => {
      const fn = async (x: number) => x * 2;
      const wrapped = withErrorHandling(fn, {
        module: 'test',
        action: 'multiply',
      });

      const result = await wrapped(5);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(10);
      }
    });

    it('should catch errors and wrap in Err', async () => {
      const fn = async () => {
        throw new Error('Something went wrong');
      };
      const wrapped = withErrorHandling(fn, {
        module: 'test',
        action: 'fail',
      });

      const result = await wrapped();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AppError);
      }
    });

    it('should preserve AppError types', async () => {
      const error = new BadRequestError('Invalid input');
      const fn = async () => {
        throw error;
      };
      const wrapped = withErrorHandling(fn, {
        module: 'test',
        action: 'fail',
      });

      const result = await wrapped();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const wrapped = withRetry(fn, { maxAttempts: 3, delayMs: 10 });

      const result = await wrapped();
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');
      const wrapped = withRetry(fn, { maxAttempts: 3, delayMs: 10 });

      const result = await wrapped();
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max attempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));
      const wrapped = withRetry(fn, { maxAttempts: 3, delayMs: 10 });

      await expect(wrapped()).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect shouldRetry predicate', async () => {
      const fn = vi.fn().mockRejectedValue(new BadRequestError('bad input'));
      const wrapped = withRetry(fn, {
        maxAttempts: 3,
        delayMs: 10,
        shouldRetry: (e: unknown) => !(e instanceof BadRequestError),
      });

      await expect(wrapped()).rejects.toThrow('bad input');
      expect(fn).toHaveBeenCalledTimes(1); // No retry because shouldRetry returned false
    });
  });

  describe('withSafeRetry', () => {
    it('should return Ok on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const wrapped = withSafeRetry(fn, {
        maxAttempts: 3,
        delayMs: 10,
        module: 'test',
        action: 'safeRetry',
      });

      const result = await wrapped();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });

    it('should return Err after max attempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));
      const wrapped = withSafeRetry(fn, {
        maxAttempts: 2,
        delayMs: 10,
        module: 'test',
        action: 'safeRetry',
      });

      const result = await wrapped();
      expect(result.ok).toBe(false);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
