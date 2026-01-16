/**
 * Unit tests for Gemini utility functions
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseGeminiJSONResponse } from './utils';

// Mock the logger to prevent actual logging during tests
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Gemini Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseGeminiJSONResponse', () => {
    interface TestData {
      key: string;
      value: number;
      nested?: { items: string[] };
    }

    describe('raw JSON parsing', () => {
      it('should parse plain JSON string', () => {
        const jsonString = '{"key": "test", "value": 42}';
        const result = parseGeminiJSONResponse<TestData>(jsonString);

        expect(result.key).toBe('test');
        expect(result.value).toBe(42);
      });

      it('should parse JSON with nested objects', () => {
        const jsonString = '{"key": "test", "value": 1, "nested": {"items": ["a", "b"]}}';
        const result = parseGeminiJSONResponse<TestData>(jsonString);

        expect(result.nested?.items).toEqual(['a', 'b']);
      });

      it('should parse JSON with whitespace', () => {
        const jsonString = `{
          "key": "test",
          "value": 100
        }`;
        const result = parseGeminiJSONResponse<TestData>(jsonString);

        expect(result.key).toBe('test');
        expect(result.value).toBe(100);
      });

      it('should parse JSON with special characters in strings', () => {
        const jsonString = '{"key": "test\\nwith\\nnewlines", "value": 0}';
        const result = parseGeminiJSONResponse<TestData>(jsonString);

        expect(result.key).toBe('test\nwith\nnewlines');
      });
    });

    describe('markdown-wrapped JSON parsing', () => {
      it('should parse JSON wrapped in markdown code block', () => {
        const markdownJson = '```json\n{"key": "markdown", "value": 99}\n```';
        const result = parseGeminiJSONResponse<TestData>(markdownJson);

        expect(result.key).toBe('markdown');
        expect(result.value).toBe(99);
      });

      it('should parse JSON with text before markdown block', () => {
        const response = 'Here is the result:\n```json\n{"key": "prefixed", "value": 1}\n```';
        const result = parseGeminiJSONResponse<TestData>(response);

        expect(result.key).toBe('prefixed');
        expect(result.value).toBe(1);
      });

      it('should parse JSON with text after markdown block', () => {
        const response = '```json\n{"key": "suffixed", "value": 2}\n```\nHope this helps!';
        const result = parseGeminiJSONResponse<TestData>(response);

        expect(result.key).toBe('suffixed');
        expect(result.value).toBe(2);
      });

      it('should parse multiline JSON in markdown block', () => {
        const response = `\`\`\`json
{
  "key": "multiline",
  "value": 3,
  "nested": {
    "items": ["x", "y", "z"]
  }
}
\`\`\``;
        const result = parseGeminiJSONResponse<TestData>(response);

        expect(result.key).toBe('multiline');
        expect(result.nested?.items).toEqual(['x', 'y', 'z']);
      });
    });

    describe('JSON extraction from mixed content', () => {
      it('should extract JSON object from text with surrounding content', () => {
        const response = 'The analysis shows: {"key": "extracted", "value": 5} end of response.';
        const result = parseGeminiJSONResponse<TestData>(response);

        expect(result.key).toBe('extracted');
        expect(result.value).toBe(5);
      });

      it('should handle JSON preceded by explanation text', () => {
        const response =
          'Based on my analysis, here is the structured data:\n{"key": "data", "value": 10}';
        const result = parseGeminiJSONResponse<TestData>(response);

        expect(result.key).toBe('data');
        expect(result.value).toBe(10);
      });
    });

    describe('invalid JSON handling', () => {
      it('should throw error for completely invalid JSON', () => {
        const invalidJson = 'This is not JSON at all';

        expect(() => parseGeminiJSONResponse(invalidJson)).toThrow(
          'Invalid JSON response from Gemini API'
        );
      });

      it('should throw error for malformed JSON', () => {
        const malformedJson = '{"key": "unclosed string, "value": 1}';

        expect(() => parseGeminiJSONResponse(malformedJson)).toThrow(
          'Invalid JSON response from Gemini API'
        );
      });

      it('should throw error for truncated JSON', () => {
        const truncatedJson = '{"key": "test", "value":';

        expect(() => parseGeminiJSONResponse(truncatedJson)).toThrow(
          'Invalid JSON response from Gemini API'
        );
      });

      it('should throw error for empty string', () => {
        expect(() => parseGeminiJSONResponse('')).toThrow('Empty response from Gemini API');
      });

      it('should parse array JSON and return it as-is', () => {
        // Arrays are valid JSON and the function will parse them via the fallback
        // The function doesn't restrict to objects only
        const arrayJson = '[1, 2, 3]';
        const result = parseGeminiJSONResponse<number[]>(arrayJson);
        expect(result).toEqual([1, 2, 3]);
      });
    });

    describe('context logging', () => {
      it('should use provided context for error logging', async () => {
        const { logger } = await import('@/lib/utils/logger');
        const invalidJson = 'not json';

        try {
          parseGeminiJSONResponse(invalidJson, {
            module: 'test-module',
            action: 'test-action',
          });
        } catch {
          // Expected to throw
        }

        expect(logger.error).toHaveBeenCalledWith(
          'Failed to parse Gemini JSON response',
          expect.any(Error),
          expect.objectContaining({
            module: 'test-module',
            action: 'test-action',
          })
        );
      });

      it('should use default context when not provided', async () => {
        const { logger } = await import('@/lib/utils/logger');
        const invalidJson = 'not json';

        try {
          parseGeminiJSONResponse(invalidJson);
        } catch {
          // Expected to throw
        }

        expect(logger.error).toHaveBeenCalledWith(
          'Failed to parse Gemini JSON response',
          expect.any(Error),
          expect.objectContaining({
            module: 'gemini-utils',
            action: 'parseGeminiJSONResponse',
          })
        );
      });
    });

    describe('edge cases', () => {
      it('should handle JSON with empty values', () => {
        const jsonString = '{"key": "", "value": 0}';
        const result = parseGeminiJSONResponse<TestData>(jsonString);

        expect(result.key).toBe('');
        expect(result.value).toBe(0);
      });

      it('should handle JSON with null values', () => {
        interface NullableData {
          key: string | null;
          value: number;
        }
        const jsonString = '{"key": null, "value": 0}';
        const result = parseGeminiJSONResponse<NullableData>(jsonString);

        expect(result.key).toBe(null);
      });

      it('should handle JSON with boolean values', () => {
        interface BoolData {
          enabled: boolean;
          disabled: boolean;
        }
        const jsonString = '{"enabled": true, "disabled": false}';
        const result = parseGeminiJSONResponse<BoolData>(jsonString);

        expect(result.enabled).toBe(true);
        expect(result.disabled).toBe(false);
      });

      it('should handle JSON with array values', () => {
        interface ArrayData {
          items: number[];
        }
        const jsonString = '{"items": [1, 2, 3, 4, 5]}';
        const result = parseGeminiJSONResponse<ArrayData>(jsonString);

        expect(result.items).toEqual([1, 2, 3, 4, 5]);
      });

      it('should prefer markdown block over raw JSON when both present', () => {
        const response =
          '{"key": "raw", "value": 1}\n```json\n{"key": "markdown", "value": 2}\n```';
        const result = parseGeminiJSONResponse<TestData>(response);

        // Should prefer the markdown-wrapped version
        expect(result.key).toBe('markdown');
        expect(result.value).toBe(2);
      });
    });
  });
});
