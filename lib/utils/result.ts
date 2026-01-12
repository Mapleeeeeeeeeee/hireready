/**
 * Result type and Higher-Order Functions for unified error handling
 * Inspired by Rust's Result type and Go's error handling patterns
 */

import { logger } from './logger';
import { AppError, toAppError } from './errors';

/**
 * Result type - represents either success (Ok) or failure (Err)
 */
export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Create a successful Result
 */
export const Ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value,
});

/**
 * Create a failed Result
 */
export const Err = <E>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

/**
 * Check if Result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

/**
 * Check if Result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

/**
 * Unwrap a Result, throwing if it's an error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap a Result with a default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

/**
 * Map over a successful Result
 */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (result.ok) {
    return Ok(fn(result.value));
  }
  return result;
}

// ============================================================
// Higher-Order Functions for Error Handling
// ============================================================

export interface ErrorHandlingOptions {
  module: string;
  action: string;
  rethrow?: boolean;
}

/**
 * HOF: Wrap an async function with unified error handling
 * Converts thrown errors to Result type and logs them
 */
export function withErrorHandling<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: ErrorHandlingOptions
): (...args: TArgs) => Promise<Result<TReturn>> {
  return async (...args: TArgs): Promise<Result<TReturn>> => {
    try {
      const result = await fn(...args);
      logger.debug(`${options.action} succeeded`, {
        module: options.module,
        action: options.action,
      });
      return Ok(result);
    } catch (error) {
      const appError = toAppError(error);

      logger.error(`${options.action} failed`, appError, {
        module: options.module,
        action: options.action,
      });

      if (options.rethrow) {
        throw appError;
      }

      return Err(appError);
    }
  };
}

/**
 * HOF: Wrap a sync function with unified error handling
 */
export function withErrorHandlingSync<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options: ErrorHandlingOptions
): (...args: TArgs) => Result<TReturn> {
  return (...args: TArgs): Result<TReturn> => {
    try {
      const result = fn(...args);
      return Ok(result);
    } catch (error) {
      const appError = toAppError(error);

      logger.error(`${options.action} failed`, appError, {
        module: options.module,
        action: options.action,
      });

      if (options.rethrow) {
        throw appError;
      }

      return Err(appError);
    }
  };
}

// ============================================================
// Retry Logic
// ============================================================

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

const defaultShouldRetry = (error: unknown): boolean => {
  // Don't retry non-recoverable errors
  if (error instanceof AppError && !error.recoverable) {
    return false;
  }
  return true;
};

/**
 * HOF: Add retry logic with exponential backoff
 */
export function withRetry<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions
): (...args: TArgs) => Promise<TReturn> {
  const {
    maxAttempts,
    delayMs,
    backoffMultiplier = 2,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  return async (...args: TArgs): Promise<TReturn> => {
    let lastError: unknown;
    let currentDelay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;

        const canRetry = shouldRetry(error, attempt);
        const hasMoreAttempts = attempt < maxAttempts;

        if (!canRetry || !hasMoreAttempts) {
          break;
        }

        logger.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying...`, {
          module: 'retry',
          action: 'retry',
          attempt,
          maxAttempts,
          nextDelayMs: currentDelay,
        });

        onRetry?.(error, attempt);

        await sleep(currentDelay);
        currentDelay *= backoffMultiplier;
      }
    }

    throw lastError;
  };
}

/**
 * HOF: Combine error handling with retry logic
 */
export function withSafeRetry<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: {
    module: string;
    action: string;
    maxAttempts?: number;
    delayMs?: number;
  }
): (...args: TArgs) => Promise<Result<TReturn>> {
  const retryFn = withRetry(fn, {
    maxAttempts: options.maxAttempts ?? 3,
    delayMs: options.delayMs ?? 1000,
  });

  return withErrorHandling(retryFn, {
    module: options.module,
    action: options.action,
  });
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute multiple Results in sequence, stopping at first error
 */
export async function sequence<T>(fns: Array<() => Promise<Result<T>>>): Promise<Result<T[]>> {
  const results: T[] = [];

  for (const fn of fns) {
    const result = await fn();
    if (!result.ok) {
      return result;
    }
    results.push(result.value);
  }

  return Ok(results);
}

/**
 * Execute multiple Results in parallel, collecting all errors
 */
export async function parallel<T>(
  fns: Array<() => Promise<Result<T>>>
): Promise<Result<T[], AppError[]>> {
  const results = await Promise.all(fns.map((fn) => fn()));

  const successes: T[] = [];
  const errors: AppError[] = [];

  for (const result of results) {
    if (result.ok) {
      successes.push(result.value);
    } else {
      errors.push(result.error);
    }
  }

  if (errors.length > 0) {
    return { ok: false, error: errors };
  }

  return Ok(successes);
}
