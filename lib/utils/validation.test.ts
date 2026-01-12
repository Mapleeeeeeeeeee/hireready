/**
 * Unit tests for validation utilities
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { validators, validate, validateAll, pipe, transform } from './validation';
import { ValidationError } from './errors';

describe('Validators', () => {
  describe('string', () => {
    it('should accept valid strings', () => {
      const result = validators.string('name')('hello');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('hello');
      }
    });

    it('should reject non-strings', () => {
      const result = validators.string('name')(123);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('nonEmpty', () => {
    it('should accept non-empty strings', () => {
      const result = validators.nonEmpty('name')('hello');
      expect(result.ok).toBe(true);
    });

    it('should reject empty strings', () => {
      const result = validators.nonEmpty('name')('');
      expect(result.ok).toBe(false);
    });

    it('should reject whitespace-only strings', () => {
      const result = validators.nonEmpty('name')('   ');
      expect(result.ok).toBe(false);
    });
  });

  describe('number', () => {
    it('should accept valid numbers', () => {
      const result = validators.number('age')(25);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(25);
      }
    });

    it('should accept zero', () => {
      const result = validators.number('count')(0);
      expect(result.ok).toBe(true);
    });

    it('should reject NaN', () => {
      const result = validators.number('value')(NaN);
      expect(result.ok).toBe(false);
    });

    it('should reject non-numbers', () => {
      const result = validators.number('age')('25');
      expect(result.ok).toBe(false);
    });
  });

  describe('range', () => {
    it('should accept numbers within range', () => {
      const result = validators.range('score', 0, 100)(50);
      expect(result.ok).toBe(true);
    });

    it('should accept boundary values', () => {
      expect(validators.range('score', 0, 100)(0).ok).toBe(true);
      expect(validators.range('score', 0, 100)(100).ok).toBe(true);
    });

    it('should reject numbers below range', () => {
      const result = validators.range('score', 0, 100)(-1);
      expect(result.ok).toBe(false);
    });

    it('should reject numbers above range', () => {
      const result = validators.range('score', 0, 100)(101);
      expect(result.ok).toBe(false);
    });
  });

  describe('positiveInt', () => {
    it('should accept positive integers', () => {
      const result = validators.positiveInt('count')(5);
      expect(result.ok).toBe(true);
    });

    it('should accept zero', () => {
      const result = validators.positiveInt('count')(0);
      expect(result.ok).toBe(true);
    });

    it('should reject negative numbers', () => {
      const result = validators.positiveInt('count')(-1);
      expect(result.ok).toBe(false);
    });

    it('should reject floats', () => {
      const result = validators.positiveInt('count')(1.5);
      expect(result.ok).toBe(false);
    });
  });

  describe('boolean', () => {
    it('should accept true', () => {
      const result = validators.boolean('active')(true);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('should accept false', () => {
      const result = validators.boolean('active')(false);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    it('should reject non-booleans', () => {
      const result = validators.boolean('active')('true');
      expect(result.ok).toBe(false);
    });
  });

  describe('array', () => {
    it('should accept arrays', () => {
      const result = validators.array('items')([1, 2, 3]);
      expect(result.ok).toBe(true);
    });

    it('should accept empty arrays', () => {
      const result = validators.array('items')([]);
      expect(result.ok).toBe(true);
    });

    it('should reject non-arrays', () => {
      const result = validators.array('items')('not an array');
      expect(result.ok).toBe(false);
    });

    it('should validate array items with item validator', () => {
      const result = validators.array<number>('numbers', validators.number('item'))([1, 2, 3]);
      expect(result.ok).toBe(true);
    });

    it('should fail if any item is invalid', () => {
      const result = validators.array<number>('numbers', validators.number('item'))([1, 'two', 3]);
      expect(result.ok).toBe(false);
    });
  });

  describe('oneOf', () => {
    it('should accept allowed values', () => {
      const result = validators.oneOf('status', ['active', 'inactive'] as const)('active');
      expect(result.ok).toBe(true);
    });

    it('should reject disallowed values', () => {
      const result = validators.oneOf('status', ['active', 'inactive'] as const)('pending');
      expect(result.ok).toBe(false);
    });
  });

  describe('pattern', () => {
    it('should accept matching strings', () => {
      const result = validators.pattern('code', /^[A-Z]{3}$/)('ABC');
      expect(result.ok).toBe(true);
    });

    it('should reject non-matching strings', () => {
      const result = validators.pattern('code', /^[A-Z]{3}$/)('abc');
      expect(result.ok).toBe(false);
    });
  });

  describe('email', () => {
    it('should accept valid emails', () => {
      expect(validators.email('email')('test@example.com').ok).toBe(true);
      expect(validators.email('email')('user.name@domain.org').ok).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validators.email('email')('not-an-email').ok).toBe(false);
      expect(validators.email('email')('missing@domain').ok).toBe(false);
    });
  });

  describe('optional', () => {
    it('should accept undefined', () => {
      const result = validators.optional(validators.string('name'))(undefined);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeUndefined();
      }
    });

    it('should accept null', () => {
      const result = validators.optional(validators.string('name'))(null);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeUndefined();
      }
    });

    it('should validate non-null values', () => {
      const result = validators.optional(validators.string('name'))('hello');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('hello');
      }
    });

    it('should fail for invalid non-null values', () => {
      const result = validators.optional(validators.string('name'))(123);
      expect(result.ok).toBe(false);
    });
  });

  describe('required', () => {
    it('should reject undefined', () => {
      const result = validators.required('name', validators.string('name'))(undefined);
      expect(result.ok).toBe(false);
    });

    it('should reject null', () => {
      const result = validators.required('name', validators.string('name'))(null);
      expect(result.ok).toBe(false);
    });

    it('should validate present values', () => {
      const result = validators.required('name', validators.string('name'))('hello');
      expect(result.ok).toBe(true);
    });
  });
});

describe('Schema Validation', () => {
  describe('validate', () => {
    it('should validate objects against schema', () => {
      const schema = {
        name: validators.nonEmpty('name'),
        age: validators.positiveInt('age'),
      };

      const result = validate({ name: 'John', age: 25 }, schema);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ name: 'John', age: 25 });
      }
    });

    it('should fail on first error', () => {
      const schema = {
        name: validators.nonEmpty('name'),
        age: validators.positiveInt('age'),
      };

      const result = validate({ name: '', age: -1 }, schema);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should fail on name first
        expect(result.error.field).toBe('name');
      }
    });

    it('should reject non-objects', () => {
      const schema = {
        name: validators.string('name'),
      };

      const result = validate('not an object', schema);
      expect(result.ok).toBe(false);
    });
  });

  describe('validateAll', () => {
    it('should collect all errors', () => {
      const schema = {
        name: validators.nonEmpty('name'),
        age: validators.positiveInt('age'),
      };

      const result = validateAll({ name: '', age: -1 }, schema);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveLength(2);
      }
    });
  });
});

describe('Validator Combinators', () => {
  describe('pipe', () => {
    it('should chain validators', () => {
      const validatePassword = pipe(validators.string('password'), (value: string) =>
        value.length >= 8
          ? { ok: true as const, value }
          : { ok: false as const, error: new ValidationError('password', 'Too short') }
      );

      expect(validatePassword('short').ok).toBe(false);
      expect(validatePassword('longenough').ok).toBe(true);
    });
  });

  describe('transform', () => {
    it('should transform validated values', () => {
      const validateAndTrim = transform(validators.string('input'), (s) => s.trim());

      const result = validateAndTrim('  hello  ');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('hello');
      }
    });
  });
});
