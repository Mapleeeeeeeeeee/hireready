/**
 * Validation utilities with Result type integration
 * Provides composable validators for input validation
 */

import { ValidationError } from './errors';
import { Result, Ok, Err } from './result';

/**
 * Validator function type
 */
export type Validator<T> = (value: unknown) => Result<T, ValidationError>;

/**
 * Schema type for object validation
 */
export type ValidationSchema<T> = {
  [K in keyof T]: Validator<T[K]>;
};

// ============================================================
// Basic Validators
// ============================================================

export const validators = {
  /**
   * Validate that value is a string
   */
  string:
    (field: string): Validator<string> =>
    (value) => {
      if (typeof value !== 'string') {
        return Err(new ValidationError(field, `${field} must be a string`));
      }
      return Ok(value);
    },

  /**
   * Validate that value is a non-empty string
   */
  nonEmpty:
    (field: string): Validator<string> =>
    (value) => {
      const strResult = validators.string(field)(value);
      if (!strResult.ok) return strResult;

      if (strResult.value.trim() === '') {
        return Err(new ValidationError(field, `${field} cannot be empty`));
      }
      return Ok(strResult.value);
    },

  /**
   * Validate that value is a number
   */
  number:
    (field: string): Validator<number> =>
    (value) => {
      if (typeof value !== 'number' || isNaN(value)) {
        return Err(new ValidationError(field, `${field} must be a number`));
      }
      return Ok(value);
    },

  /**
   * Validate that number is within range
   */
  range:
    (field: string, min: number, max: number): Validator<number> =>
    (value) => {
      const numResult = validators.number(field)(value);
      if (!numResult.ok) return numResult;

      if (numResult.value < min || numResult.value > max) {
        return Err(new ValidationError(field, `${field} must be between ${min} and ${max}`));
      }
      return Ok(numResult.value);
    },

  /**
   * Validate that number is a positive integer
   */
  positiveInt:
    (field: string): Validator<number> =>
    (value) => {
      const numResult = validators.number(field)(value);
      if (!numResult.ok) return numResult;

      if (!Number.isInteger(numResult.value) || numResult.value < 0) {
        return Err(new ValidationError(field, `${field} must be a positive integer`));
      }
      return Ok(numResult.value);
    },

  /**
   * Validate that value is a boolean
   */
  boolean:
    (field: string): Validator<boolean> =>
    (value) => {
      if (typeof value !== 'boolean') {
        return Err(new ValidationError(field, `${field} must be a boolean`));
      }
      return Ok(value);
    },

  /**
   * Validate that value is an array
   */
  array:
    <T>(field: string, itemValidator?: Validator<T>): Validator<T[]> =>
    (value) => {
      if (!Array.isArray(value)) {
        return Err(new ValidationError(field, `${field} must be an array`));
      }

      if (itemValidator) {
        const validatedItems: T[] = [];
        for (let i = 0; i < value.length; i++) {
          const itemResult = itemValidator(value[i]);
          if (!itemResult.ok) {
            return Err(
              new ValidationError(
                `${field}[${i}]`,
                `Invalid item at index ${i}: ${itemResult.error.message}`
              )
            );
          }
          validatedItems.push(itemResult.value);
        }
        return Ok(validatedItems);
      }

      return Ok(value as T[]);
    },

  /**
   * Validate that value matches one of the allowed values
   */
  oneOf:
    <T extends string | number>(field: string, allowed: readonly T[]): Validator<T> =>
    (value) => {
      if (!allowed.includes(value as T)) {
        return Err(new ValidationError(field, `${field} must be one of: ${allowed.join(', ')}`));
      }
      return Ok(value as T);
    },

  /**
   * Validate that value matches a regex pattern
   */
  pattern:
    (field: string, regex: RegExp, message?: string): Validator<string> =>
    (value) => {
      const strResult = validators.string(field)(value);
      if (!strResult.ok) return strResult;

      if (!regex.test(strResult.value)) {
        return Err(new ValidationError(field, message ?? `${field} has invalid format`));
      }
      return Ok(strResult.value);
    },

  /**
   * Validate email format
   */
  email:
    (field: string): Validator<string> =>
    (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return validators.pattern(field, emailRegex, `${field} must be a valid email address`)(value);
    },

  /**
   * Make a validator optional (allows undefined/null)
   */
  optional:
    <T>(validator: Validator<T>): Validator<T | undefined> =>
    (value) => {
      if (value === undefined || value === null) {
        return Ok(undefined);
      }
      return validator(value);
    },

  /**
   * Validate that value is not null or undefined
   */
  required:
    <T>(field: string, validator: Validator<T>): Validator<T> =>
    (value) => {
      if (value === undefined || value === null) {
        return Err(new ValidationError(field, `${field} is required`));
      }
      return validator(value);
    },
};

// ============================================================
// Schema Validation
// ============================================================

/**
 * Validate an object against a schema
 */
export function validate<T extends Record<string, unknown>>(
  data: unknown,
  schema: ValidationSchema<T>
): Result<T, ValidationError> {
  if (typeof data !== 'object' || data === null) {
    return Err(new ValidationError('data', 'Invalid data format'));
  }

  const result = {} as T;
  const dataObj = data as Record<string, unknown>;

  for (const [key, validator] of Object.entries(schema)) {
    const fieldResult = (validator as Validator<unknown>)(dataObj[key]);
    if (!fieldResult.ok) {
      return fieldResult as Result<T, ValidationError>;
    }
    (result as Record<string, unknown>)[key] = fieldResult.value;
  }

  return Ok(result);
}

/**
 * Validate and return first error or all validated fields
 */
export function validateAll<T extends Record<string, unknown>>(
  data: unknown,
  schema: ValidationSchema<T>
): Result<T, ValidationError[]> {
  if (typeof data !== 'object' || data === null) {
    return Err([new ValidationError('data', 'Invalid data format')]);
  }

  const result = {} as T;
  const errors: ValidationError[] = [];
  const dataObj = data as Record<string, unknown>;

  for (const [key, validator] of Object.entries(schema)) {
    const fieldResult = (validator as Validator<unknown>)(dataObj[key]);
    if (!fieldResult.ok) {
      errors.push(fieldResult.error);
    } else {
      (result as Record<string, unknown>)[key] = fieldResult.value;
    }
  }

  if (errors.length > 0) {
    return Err(errors);
  }

  return Ok(result);
}

// ============================================================
// Validator Combinators
// ============================================================

/**
 * Chain multiple validators (all must pass)
 */
export function pipe<T>(
  ...validators: Array<(value: T) => Result<T, ValidationError>>
): Validator<T> {
  return (value: unknown) => {
    let current = value as T;

    for (const validator of validators) {
      const result = validator(current);
      if (!result.ok) {
        return result;
      }
      current = result.value;
    }

    return Ok(current);
  };
}

/**
 * Transform validated value
 */
export function transform<T, U>(validator: Validator<T>, fn: (value: T) => U): Validator<U> {
  return (value: unknown) => {
    const result = validator(value);
    if (!result.ok) {
      return result;
    }
    return Ok(fn(result.value));
  };
}
