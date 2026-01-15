'use server';

/**
 * Resume parsing service using Gemini Vision API
 * Extracts structured content from PDF and image resumes
 */

import { promises as fs } from 'fs';
import { serverEnv } from '@/lib/config/server';
import { geminiConfig } from '@/lib/config';
import { logger } from '@/lib/utils/logger';
import { parseGeminiJSONResponse } from '@/lib/gemini/utils';
import type { ResumeContent } from './types';

// ============================================================
// Constants
// ============================================================

const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${geminiConfig.model}:generateContent`;
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds for resume parsing

// ============================================================
// Prompt Builder
// ============================================================

/**
 * Build resume parsing prompt for Gemini API
 */
function buildParsingPrompt(): string {
  return `You are an expert resume parser. Extract all relevant information from this resume document.

Requirements:
- Extract ONLY information that is explicitly visible in the document
- Do NOT infer, assume, or fabricate any information that is not clearly present
- If a field cannot be found, use null for strings or empty array for arrays
- Do NOT guess dates, company names, skills, or any other details
- For skills, include both technical and soft skills found in the document
- For experience, list jobs in reverse chronological order
- For education, list degrees in reverse chronological order
- Include all readable text in the rawText field
- Preserve the original language of the resume content`;
}

// ============================================================
// File Handling
// ============================================================

/**
 * Get MIME type string for Gemini API
 */
function getGeminiMimeType(filePath: string): string {
  const extension = filePath.toLowerCase().split('.').pop();
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

// ============================================================
// Main Parser Function
// ============================================================

/**
 * Parse resume file using Gemini Vision API
 * @param filePath - Full path to the resume file on disk
 * @returns Structured resume content
 */
export async function parseResume(filePath: string): Promise<ResumeContent> {
  const logContext = { module: 'gemini-parser', action: 'parseResume' };

  logger.info('Starting resume parsing', {
    ...logContext,
    filePath,
  });

  const apiKey = serverEnv.geminiApiKey;
  if (!apiKey) {
    logger.error('GEMINI_API_KEY not configured', undefined, logContext);
    throw new Error('Gemini API key not configured');
  }

  try {
    // Read file as base64
    const fileBuffer = await fs.readFile(filePath);
    const base64Data = fileBuffer.toString('base64');
    const mimeType = getGeminiMimeType(filePath);

    logger.info('Calling Gemini API for resume parsing', {
      ...logContext,
      fileSize: fileBuffer.length,
      mimeType,
    });

    let response: Response;
    try {
      response = await fetch(GEMINI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: buildParsingPrompt(),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent extraction
            maxOutputTokens: 8192, // Larger output for complete resume content
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', nullable: true },
                email: { type: 'string', nullable: true },
                phone: { type: 'string', nullable: true },
                summary: { type: 'string', nullable: true },
                skills: { type: 'array', items: { type: 'string' } },
                experience: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      company: { type: 'string' },
                      title: { type: 'string' },
                      duration: { type: 'string' },
                      description: { type: 'string', nullable: true },
                    },
                    required: ['company', 'title', 'duration'],
                  },
                },
                education: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      school: { type: 'string' },
                      degree: { type: 'string' },
                      year: { type: 'string', nullable: true },
                    },
                    required: ['school', 'degree'],
                  },
                },
                rawText: { type: 'string', nullable: true },
              },
            },
          },
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('Resume parsing request timeout');
      }
      throw error;
    }

    logger.info('Received response from Gemini API', {
      ...logContext,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Gemini API error during resume parsing', undefined, {
        ...logContext,
        status: response.status,
        error: errorText,
      });
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      logger.error('Invalid API response structure', undefined, {
        ...logContext,
        response: JSON.stringify(data).slice(0, 500),
      });
      throw new Error('No text content in Gemini API response');
    }

    logger.info('Received parsing response from Gemini', {
      ...logContext,
      responseLength: responseText.length,
    });

    // Parse JSON response
    const resumeContent = parseGeminiJSONResponse<ResumeContent>(responseText, {
      module: 'gemini-parser',
      action: 'parseResume',
    });

    // Validate and clean the response
    const cleanedContent: ResumeContent = {
      name: resumeContent.name || undefined,
      email: resumeContent.email || undefined,
      phone: resumeContent.phone || undefined,
      summary: resumeContent.summary || undefined,
      skills: Array.isArray(resumeContent.skills) ? resumeContent.skills : [],
      experience: Array.isArray(resumeContent.experience) ? resumeContent.experience : [],
      education: Array.isArray(resumeContent.education) ? resumeContent.education : [],
      rawText: resumeContent.rawText || undefined,
    };

    logger.info('Resume parsed successfully', {
      ...logContext,
      hasName: !!cleanedContent.name,
      skillsCount: cleanedContent.skills?.length || 0,
      experienceCount: cleanedContent.experience?.length || 0,
      educationCount: cleanedContent.education?.length || 0,
    });

    return cleanedContent;
  } catch (error) {
    logger.error('Resume parsing failed', error as Error, logContext);
    throw error;
  }
}
