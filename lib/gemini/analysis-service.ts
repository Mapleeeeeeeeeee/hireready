'use server';

/**
 * AI interview analysis service using Gemini API
 * Analyzes interview transcripts and generates model answers with TTS audio
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { serverEnv } from '@/lib/config/server';
import { geminiConfig } from '@/lib/config';
import { logger } from '@/lib/utils/logger';
import type { TranscriptEntry } from '@/lib/gemini/types';
import type { ModelAnswer } from '@/lib/types/interview';

// ============================================================
// Types
// ============================================================

export interface AnalyzeInterviewInput {
  /** Interview transcript entries */
  transcripts: TranscriptEntry[];
  /** Optional job description URL for context */
  jobDescriptionUrl?: string;
  /** Language for analysis and TTS */
  language: 'en' | 'zh-TW';
}

export interface AnalysisResult {
  /** Overall interview score (0-100) */
  score: number;
  /** List of strengths identified */
  strengths: string[];
  /** List of areas for improvement */
  improvements: string[];
  /** Model answer with ideal responses */
  modelAnswer: ModelAnswer;
}

interface GeminiAnalysisResponse {
  score: number;
  strengths: string[];
  improvements: string[];
  modelTranscript: Array<{
    role: 'user' | 'ai';
    text: string;
    timestamp: number;
    isFinal: boolean;
  }>;
}

// ============================================================
// Constants
// ============================================================

const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${geminiConfig.model}:generateContent`;
const REQUEST_TIMEOUT_MS = geminiConfig.timeouts.analysis;
const MODEL_ANSWERS_DIR = 'model-answers';

// ============================================================
// Prompt Builder
// ============================================================

/**
 * Format transcripts for prompt display
 */
function formatTranscripts(transcripts: TranscriptEntry[]): string {
  return transcripts
    .filter((t) => t.isFinal)
    .map((t) => {
      const role = t.role === 'user' ? 'Candidate' : 'Interviewer';
      return `[${role}]: ${t.text}`;
    })
    .join('\n');
}

/**
 * Build analysis prompt for Gemini API
 */
function buildAnalysisPrompt(
  transcripts: TranscriptEntry[],
  jobDescriptionUrl: string | undefined,
  language: 'en' | 'zh-TW'
): string {
  const isZhTW = language === 'zh-TW';

  return `You are an expert interview coach analyzing a job interview.

${jobDescriptionUrl ? `Job Description: ${jobDescriptionUrl}\n` : ''}
Interview Transcript:
${formatTranscripts(transcripts)}

Analyze this interview and output ONLY valid JSON with this structure:
{
  "score": <number 0-100>,
  "strengths": [<string>, ...],
  "improvements": [<string>, ...],
  "modelTranscript": [
    {"role": "user", "text": "<question>", "timestamp": <ms>, "isFinal": true},
    {"role": "ai", "text": "<ideal answer>", "timestamp": <ms>, "isFinal": true}
  ]
}

Requirements:
- score: Overall performance score from 0 to 100
- strengths: At least 2 specific strengths with examples
- improvements: At least 2 actionable improvement suggestions
- modelTranscript: Recreate the interview with ideal candidate responses (keep original questions, improve answers)

${isZhTW ? 'Output all text content in Traditional Chinese (繁體中文).' : 'Output all text content in English.'}

CRITICAL: Respond ONLY with the JSON object. No markdown code blocks, no explanations, no additional text.`;
}

// ============================================================
// JSON Parsing
// ============================================================

/**
 * Parse JSON from Gemini response, handling markdown code blocks
 */
function parseGeminiJSON(responseText: string): GeminiAnalysisResponse {
  try {
    // Try to extract JSON from markdown code blocks first
    const markdownMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch?.[1]) {
      return JSON.parse(markdownMatch[1]);
    }

    // Try to extract raw JSON object
    const jsonMatch = responseText.match(/{[\s\S]*}/);
    if (jsonMatch?.[0]) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: try parsing the whole text
    return JSON.parse(responseText);
  } catch (error) {
    logger.error('Failed to parse Gemini JSON response', error as Error, {
      module: 'analysis-service',
      action: 'parseGeminiJSON',
      responsePreview: responseText.slice(0, 200),
    });
    throw new Error('Invalid JSON response from Gemini API');
  }
}

// ============================================================
// TTS Generation
// ============================================================

/**
 * Generate TTS audio for model answer using Gemini API
 * @returns URL path to the generated audio file (e.g., "/model-answers/abc123.mp3")
 */
async function generateTTS(
  transcript: TranscriptEntry[],
  language: 'en' | 'zh-TW'
): Promise<string> {
  const logContext = { module: 'analysis-service', action: 'generateTTS' };

  // Extract only AI responses for TTS
  const aiResponses = transcript.filter((t) => t.role === 'ai').map((t) => t.text);

  if (aiResponses.length === 0) {
    logger.warn('No AI responses found in transcript for TTS', logContext);
    throw new Error('No AI responses to generate audio');
  }

  const textToSpeak = aiResponses.join('\n\n');

  logger.info('Generating TTS audio', {
    ...logContext,
    textLength: textToSpeak.length,
    language,
  });

  try {
    const apiKey = serverEnv.geminiApiKey;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Select voice based on language
    const voiceName = geminiConfig.voices[language];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), geminiConfig.timeouts.tts);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiConfig.model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: textToSpeak }],
              },
            ],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName,
                  },
                },
              },
            },
          }),
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini TTS API error', undefined, {
          ...logContext,
          status: response.status,
          error: errorText,
        });
        throw new Error(`Gemini TTS API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Extract base64 audio data
      const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        logger.error('Invalid TTS response structure', undefined, {
          ...logContext,
          response: JSON.stringify(data).slice(0, 500),
        });
        throw new Error('No audio data in Gemini TTS response');
      }

      // Save audio file to public directory
      const audioId = crypto.randomUUID();
      const audioFileName = `${audioId}.mp3`;
      const audioPath = `/${MODEL_ANSWERS_DIR}/${audioFileName}`;
      const fullPath = path.join(process.cwd(), 'public', MODEL_ANSWERS_DIR, audioFileName);

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Write audio file
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      await fs.writeFile(fullPath, audioBuffer);

      logger.info('TTS audio generated successfully', {
        ...logContext,
        audioPath,
        audioSize: audioBuffer.length,
      });

      return audioPath;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('TTS generation timeout');
      }
      throw error;
    }
  } catch (error) {
    logger.error('Failed to generate TTS audio', error as Error, logContext);
    throw error;
  }
}

// ============================================================
// Main Analysis Function
// ============================================================

/**
 * Analyze interview transcript using Gemini API
 * Generates score, feedback, and model answer with TTS audio
 */
export async function analyzeInterview(input: AnalyzeInterviewInput): Promise<AnalysisResult> {
  const { transcripts, jobDescriptionUrl, language } = input;
  const logContext = { module: 'analysis-service', action: 'analyzeInterview' };

  logger.info('Starting interview analysis', {
    ...logContext,
    transcriptCount: transcripts.length,
    language,
    hasJobDescription: !!jobDescriptionUrl,
  });

  // Validate input
  if (transcripts.length === 0) {
    throw new Error('Cannot analyze empty transcript');
  }

  const apiKey = serverEnv.geminiApiKey;
  if (!apiKey) {
    logger.error('GEMINI_API_KEY not configured', undefined, logContext);
    throw new Error('Gemini API key not configured');
  }

  try {
    // Step 1: Call Gemini API for analysis
    const prompt = buildAnalysisPrompt(transcripts, jobDescriptionUrl, language);

    logger.debug('Calling Gemini API for analysis', {
      ...logContext,
      promptLength: prompt.length,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(GEMINI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Analysis request timeout');
      }
      throw error;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Gemini API error', undefined, {
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

    logger.debug('Received analysis response', {
      ...logContext,
      responseLength: responseText.length,
    });

    // Step 2: Parse JSON response
    const analysisData = parseGeminiJSON(responseText);

    // Validate required fields
    if (
      typeof analysisData.score !== 'number' ||
      !Array.isArray(analysisData.strengths) ||
      !Array.isArray(analysisData.improvements) ||
      !Array.isArray(analysisData.modelTranscript)
    ) {
      logger.error('Invalid analysis data structure', undefined, {
        ...logContext,
        data: analysisData,
      });
      throw new Error('Invalid analysis data structure from Gemini');
    }

    // Ensure minimum requirements
    if (analysisData.strengths.length < 2) {
      logger.warn('Insufficient strengths returned', {
        ...logContext,
        count: analysisData.strengths.length,
      });
    }
    if (analysisData.improvements.length < 2) {
      logger.warn('Insufficient improvements returned', {
        ...logContext,
        count: analysisData.improvements.length,
      });
    }

    // Step 3: Convert model transcript to TranscriptEntry format
    const modelTranscript: TranscriptEntry[] = analysisData.modelTranscript.map((entry) => ({
      id: crypto.randomUUID(),
      role: entry.role,
      text: entry.text,
      timestamp: entry.timestamp || Date.now(),
      isFinal: entry.isFinal !== undefined ? entry.isFinal : true,
    }));

    logger.info('Analysis completed successfully', {
      ...logContext,
      score: analysisData.score,
      strengthsCount: analysisData.strengths.length,
      improvementsCount: analysisData.improvements.length,
      modelTranscriptCount: modelTranscript.length,
    });

    // Step 4: Generate TTS audio for model answer
    let audioUrl: string | undefined;
    try {
      audioUrl = await generateTTS(modelTranscript, language);
    } catch (error) {
      // TTS is optional - log error but continue
      logger.warn('Failed to generate TTS audio, continuing without audio', {
        ...logContext,
        error: (error as Error).message,
      });
      audioUrl = undefined;
    }

    return {
      score: analysisData.score,
      strengths: analysisData.strengths,
      improvements: analysisData.improvements,
      modelAnswer: {
        transcript: modelTranscript,
        audioUrl,
      },
    };
  } catch (error) {
    logger.error('Interview analysis failed', error as Error, logContext);
    throw error;
  }
}
