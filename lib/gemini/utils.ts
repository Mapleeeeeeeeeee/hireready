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
  const logContext = {
    module: context?.module ?? 'gemini-utils',
    action: context?.action ?? 'parseGeminiJSONResponse',
  };

  // Check for empty response
  if (!responseText || responseText.trim().length === 0) {
    logger.error('Empty response from Gemini API', undefined, logContext);
    throw new Error('Empty response from Gemini API');
  }

  try {
    // Try to extract JSON from markdown code blocks first
    const markdownMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch?.[1]) {
      logger.debug('Parsing JSON from markdown code block', logContext);
      return JSON.parse(markdownMatch[1]) as T;
    }

    // Try direct JSON parsing first (most common with structured output)
    try {
      const trimmed = responseText.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return JSON.parse(trimmed) as T;
      }
    } catch {
      // Fall through to regex extraction
    }

    // Try to extract raw JSON object
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch?.[0]) {
      logger.debug('Extracting JSON from response text', logContext);
      return JSON.parse(jsonMatch[0]) as T;
    }

    // Fallback: try parsing the whole text
    return JSON.parse(responseText) as T;
  } catch (error) {
    // Log detailed error info for debugging
    const firstChars = responseText.slice(0, 100);
    const charCodes = Array.from(firstChars.slice(0, 20)).map((c) => c.charCodeAt(0));

    logger.error('Failed to parse Gemini JSON response', error as Error, {
      ...logContext,
      responseLength: responseText.length,
      responsePreview: responseText.slice(0, 500),
      firstCharCodes: charCodes,
      startsWithBrace: responseText.trim().startsWith('{'),
      startsWithBracket: responseText.trim().startsWith('['),
    });

    throw new Error('Invalid JSON response from Gemini API');
  }
}
