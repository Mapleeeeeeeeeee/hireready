/**
 * Gemini API utility functions
 * Centralized utilities for parsing and processing Gemini API responses
 */

import { logger } from '@/lib/utils/logger';

// ============================================================
// JSON Parsing
// ============================================================

/**
 * Parse JSON from Gemini API response, handling markdown code blocks
 *
 * Gemini sometimes wraps JSON responses in markdown code blocks.
 * This function handles both raw JSON and markdown-wrapped JSON.
 *
 * @param responseText - Raw text response from Gemini API
 * @param context - Optional context for logging (module, action)
 * @returns Parsed JSON object
 * @throws Error if JSON cannot be parsed
 *
 * @example
 * // Raw JSON
 * parseGeminiJSONResponse<MyType>('{"key": "value"}')
 *
 * // Markdown-wrapped JSON
 * parseGeminiJSONResponse<MyType>('```json\n{"key": "value"}\n```')
 */
export function parseGeminiJSONResponse<T>(
  responseText: string,
  context?: { module: string; action: string }
): T {
  try {
    // Try to extract JSON from markdown code blocks first
    const markdownMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch?.[1]) {
      return JSON.parse(markdownMatch[1]) as T;
    }

    // Try to extract raw JSON object
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch?.[0]) {
      return JSON.parse(jsonMatch[0]) as T;
    }

    // Fallback: try parsing the whole text
    return JSON.parse(responseText) as T;
  } catch (error) {
    logger.error('Failed to parse Gemini JSON response', error as Error, {
      module: context?.module ?? 'gemini-utils',
      action: context?.action ?? 'parseGeminiJSONResponse',
      responsePreview: responseText.slice(0, 200),
    });
    throw new Error('Invalid JSON response from Gemini API');
  }
}
