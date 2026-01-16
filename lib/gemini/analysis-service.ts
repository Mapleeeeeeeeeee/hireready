'use server';

/**
 * AI interview analysis service using Gemini API
 * Analyzes interview transcripts and generates model answers
 */

import * as crypto from 'crypto';
import { serverEnv } from '@/lib/config/server';
import { geminiConfig } from '@/lib/config';
import { parseGeminiJSONResponse } from './utils';
import { logger } from '@/lib/utils/logger';
import type { TranscriptEntry } from '@/lib/gemini/types';
import type { ModelAnswer } from '@/lib/types/interview';
import type { JobDescription } from '@/lib/jd/types';
import type { ResumeContent } from '@/lib/resume/types';

// ============================================================
// Types
// ============================================================

export interface AnalyzeInterviewInput {
  /** Interview transcript entries */
  transcripts: TranscriptEntry[];
  /** Full job description object */
  jobDescription?: JobDescription | null;
  /** Candidate's resume content */
  resume?: ResumeContent | null;
  /** Language for analysis */
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
    role: 'interviewer' | 'candidate';
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
 * Format job description for prompt
 */
function formatJobDescription(jd: JobDescription): string {
  const parts: string[] = [];

  if (jd.title) parts.push(`Position: ${jd.title}`);
  if (jd.company) parts.push(`Company: ${jd.company}`);
  if (jd.location) parts.push(`Location: ${jd.location}`);
  if (jd.description) parts.push(`\nJob Description:\n${jd.description}`);
  if (jd.requirements && jd.requirements.length > 0) {
    parts.push(`\nRequirements:\n${jd.requirements.map((r) => `- ${r}`).join('\n')}`);
  }

  return parts.join('\n');
}

/**
 * Format resume content for prompt
 */
function formatResume(resume: ResumeContent): string {
  const parts: string[] = [];

  if (resume.name) parts.push(`Name: ${resume.name}`);
  if (resume.summary) parts.push(`Summary: ${resume.summary}`);
  if (resume.skills && resume.skills.length > 0) {
    parts.push(`Skills: ${resume.skills.join(', ')}`);
  }
  if (resume.experience && resume.experience.length > 0) {
    parts.push('\nWork Experience:');
    resume.experience.forEach((exp) => {
      parts.push(`- ${exp.title} at ${exp.company} (${exp.duration})`);
      if (exp.description) parts.push(`  ${exp.description}`);
    });
  }
  if (resume.education && resume.education.length > 0) {
    parts.push('\nEducation:');
    resume.education.forEach((edu) => {
      parts.push(`- ${edu.degree} from ${edu.school}${edu.year ? ` (${edu.year})` : ''}`);
    });
  }

  return parts.join('\n');
}

/**
 * Build analysis prompt for Gemini API
 */
function buildAnalysisPrompt(
  transcripts: TranscriptEntry[],
  jobDescription: JobDescription | null | undefined,
  resume: ResumeContent | null | undefined,
  language: 'en' | 'zh-TW'
): string {
  const isZhTW = language === 'zh-TW';

  const jdSection = jobDescription
    ? `\n## Target Position
${formatJobDescription(jobDescription)}\n`
    : '';

  const resumeSection = resume
    ? `\n## Candidate Background
${formatResume(resume)}\n`
    : '';

  const modelAnswerInstruction = resume
    ? isZhTW
      ? '根據候選人的實際經歷與技能，模擬他/她能夠給出的最佳回答。答案應該真實反映候選人的背景，不要編造經歷。'
      : "Based on the candidate's actual experience and skills, simulate the best possible answers they could give. Answers should reflect the candidate's real background without fabricating experience."
    : isZhTW
      ? '提供專業且有說服力的理想回答範例。'
      : 'Provide professional and compelling ideal answer examples.';

  return `You are an expert interview coach analyzing a job interview.
${jdSection}${resumeSection}
## Interview Transcript
${formatTranscripts(transcripts)}

## Analysis Requirements
- score: Overall performance score from 0 to 100
- strengths: At least 2 specific strengths with concrete examples from the transcript
- improvements: At least 2 actionable improvement suggestions with specific references
- modelTranscript: Recreate the interview with ideal candidate responses
  - Use role "interviewer" for the interviewer's questions (keep original questions exactly)
  - Use role "candidate" for the ideal candidate responses
  - ${modelAnswerInstruction}

## Scoring Guidelines (STRICTLY FOLLOW)
- **0-59 (Fail/Low)**: Candidate provided very little information, transcripts are extremely short (e.g. < 5 turns), or answers were one-word/non-substantive. **IF THE CANDIDATE SAID ALMOST NOTHING, SCORE MUST BE < 40.**
- **60-79 (Average)**: Answers were relevant but generic, lacking specific examples or depth.
- **80-89 (Good)**: Clear, structured answers with relevant examples. Good communication.
- **90-100 (Excellent)**: Outstanding responses with specific metrics, deep insights, and perfect alignment with the role.

${isZhTW ? 'Output all text content in Traditional Chinese (繁體中文).' : 'Output all text content in English.'}`;
}

// ============================================================
// Main Analysis Function
// ============================================================

/**
 * Analyze interview transcript using Gemini API
 * Generates score, feedback, and model answer
 */
export async function analyzeInterview(input: AnalyzeInterviewInput): Promise<AnalysisResult> {
  const { transcripts, jobDescription, resume, language } = input;
  const logContext = { module: 'analysis-service', action: 'analyzeInterview' };

  logger.info('Starting interview analysis', {
    ...logContext,
    transcriptCount: transcripts.length,
    language,
    hasJobDescription: !!jobDescription,
    hasResume: !!resume,
    jdTitle: jobDescription?.title,
    resumeName: resume?.name,
  });

  // Validate input
  if (transcripts.length === 0) {
    logger.error('Cannot analyze empty transcript', undefined, logContext);
    throw new Error('Cannot analyze empty transcript');
  }

  const apiKey = serverEnv.geminiApiKey;
  if (!apiKey) {
    logger.error('GEMINI_API_KEY not configured', undefined, logContext);
    throw new Error('Gemini API key not configured');
  }

  logger.info('API key present, proceeding with analysis', {
    ...logContext,
    apiKeyPresent: true,
    apiKeyLength: apiKey.length,
  });

  try {
    // Step 1: Call Gemini API for analysis
    const prompt = buildAnalysisPrompt(transcripts, jobDescription, resume, language);

    logger.info('Calling Gemini API for analysis', {
      ...logContext,
      promptLength: prompt.length,
      endpoint: GEMINI_API_ENDPOINT,
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
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                strengths: { type: 'array', items: { type: 'string' } },
                improvements: { type: 'array', items: { type: 'string' } },
                modelTranscript: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', enum: ['interviewer', 'candidate'] },
                      text: { type: 'string' },
                      timestamp: { type: 'number' },
                      isFinal: { type: 'boolean' },
                    },
                    required: ['role', 'text', 'timestamp', 'isFinal'],
                  },
                },
              },
              required: ['score', 'strengths', 'improvements', 'modelTranscript'],
            },
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

    logger.info('Received response from Gemini API', {
      ...logContext,
      status: response.status,
      statusText: response.statusText,
    });

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

    logger.info('Received analysis response from Gemini', {
      ...logContext,
      responseLength: responseText.length,
      responsePreview: responseText.slice(0, 200),
    });

    // Step 2: Parse JSON response
    const analysisData = parseGeminiJSONResponse<GeminiAnalysisResponse>(responseText, {
      module: 'analysis-service',
      action: 'analyzeInterview',
    });

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
    // Map 'interviewer' -> 'ai' (shown as interviewer in UI)
    // Map 'candidate' -> 'user' (shown as candidate/you in UI)
    const modelTranscript: TranscriptEntry[] = analysisData.modelTranscript.map((entry) => ({
      id: crypto.randomUUID(),
      role: entry.role === 'interviewer' ? 'ai' : 'user',
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

    return {
      score: analysisData.score,
      strengths: analysisData.strengths,
      improvements: analysisData.improvements,
      modelAnswer: {
        transcript: modelTranscript,
      },
    };
  } catch (error) {
    logger.error('Interview analysis failed', error as Error, logContext);
    throw error;
  }
}
