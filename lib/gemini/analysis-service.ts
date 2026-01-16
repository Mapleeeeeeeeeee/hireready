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

export async function analyzeInterviewFeedback(
  input: AnalyzeInterviewInput
): Promise<Omit<AnalysisResult, 'modelAnswer'>> {
  const { transcripts, jobDescription, resume, language } = input;
  const logContext = { module: 'analysis-service', action: 'analyzeInterviewFeedback' };

  logger.info('Starting interview feedback analysis', {
    ...logContext,
    transcriptCount: transcripts.length,
    language,
  });

  // Validate input
  if (transcripts.length === 0) {
    throw new Error('Cannot analyze empty transcript');
  }

  const apiKey = serverEnv.geminiApiKey;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const prompt = buildFeedbackAnalysisPrompt(transcripts, jobDescription, resume, language);

    const responseText = await callGeminiApi(apiKey, prompt, logContext, {
      score: { type: 'number' },
      strengths: { type: 'array', items: { type: 'string' } },
      improvements: { type: 'array', items: { type: 'string' } },
    });

    const analysisData = parseGeminiJSONResponse<Omit<GeminiAnalysisResponse, 'modelTranscript'>>(
      responseText,
      logContext
    );

    // Validate structure
    if (
      typeof analysisData.score !== 'number' ||
      !Array.isArray(analysisData.strengths) ||
      !Array.isArray(analysisData.improvements)
    ) {
      throw new Error('Invalid feedback data structure from Gemini');
    }

    return {
      score: analysisData.score,
      strengths: analysisData.strengths,
      improvements: analysisData.improvements,
    };
  } catch (error) {
    logger.error('Interview feedback analysis failed', error as Error, logContext);
    throw error;
  }
}

export async function generateModelAnswer(
  input: AnalyzeInterviewInput
): Promise<{ modelAnswer: ModelAnswer }> {
  const { transcripts, jobDescription, resume, language } = input;
  const logContext = { module: 'analysis-service', action: 'generateModelAnswer' };

  logger.info('Starting model answer generation', {
    ...logContext,
    transcriptCount: transcripts.length,
    language,
  });

  const apiKey = serverEnv.geminiApiKey;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const prompt = buildModelAnswerPrompt(transcripts, jobDescription, resume, language);

    const responseText = await callGeminiApi(apiKey, prompt, logContext, {
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
    });

    const analysisData = parseGeminiJSONResponse<{
      modelTranscript: GeminiAnalysisResponse['modelTranscript'];
    }>(responseText, logContext);

    if (!Array.isArray(analysisData.modelTranscript)) {
      throw new Error('Invalid model transcript data structure from Gemini');
    }

    const modelTranscript: TranscriptEntry[] = analysisData.modelTranscript.map((entry) => ({
      id: crypto.randomUUID(),
      role: entry.role === 'interviewer' ? 'ai' : 'user',
      text: entry.text,
      timestamp: entry.timestamp || Date.now(),
      isFinal: entry.isFinal !== undefined ? entry.isFinal : true,
    }));

    return {
      modelAnswer: {
        transcript: modelTranscript,
      },
    };
  } catch (error) {
    logger.error('Model answer generation failed', error as Error, logContext);
    throw error;
  }
}

/**
 * @deprecated Use analyzeInterviewFeedback and generateModelAnswer separately
 */
export async function analyzeInterview(input: AnalyzeInterviewInput): Promise<AnalysisResult> {
  const feedback = await analyzeInterviewFeedback(input);
  const modelAnswer = await generateModelAnswer(input);

  return {
    ...feedback,
    ...modelAnswer,
  };
}

// Helper to call Gemini API to reduce duplication
async function callGeminiApi(
  apiKey: string,
  prompt: string,
  logContext: { module: string; action: string; [key: string]: unknown },
  responseSchemaProperties: Record<string, unknown>
): Promise<string> {
  logger.info('Calling Gemini API', {
    ...logContext,
    promptLength: prompt.length,
    endpoint: GEMINI_API_ENDPOINT,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
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
            properties: responseSchemaProperties,
            required: Object.keys(responseSchemaProperties),
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No text content in Gemini API response');
    }

    return responseText;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Analysis request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildFeedbackAnalysisPrompt(
  transcripts: TranscriptEntry[],
  jobDescription: JobDescription | null | undefined,
  resume: ResumeContent | null | undefined,
  language: 'en' | 'zh-TW'
): string {
  const isZhTW = language === 'zh-TW';
  const jdSection = jobDescription
    ? `\n## Target Position\n${formatJobDescription(jobDescription)}\n`
    : '';
  const resumeSection = resume ? `\n## Candidate Background\n${formatResume(resume)}\n` : '';

  return `You are an expert interview coach analyzing a job interview.
${jdSection}${resumeSection}
## Interview Transcript
${formatTranscripts(transcripts)}

## Analysis Requirements
- score: Overall performance score from 0 to 100 based on INTERVIEW PERFORMANCE (clarity, structure, logic), not job fit.
  - CRITICAL: Score MUST be based ONLY on the 'Candidate' actual responses in the transcript.
  - CRITICAL: Do NOT score based on the Resume or the Job Description.
  - IF the candidate said nothing or only "hello", the score MUST be under 10.
- strengths: At least 2 specific strengths related to **communication style, answer structure, or logical clarity**.
  - Do NOT evaluate "technical fit" or "experience match" unless the candidate explained technical concepts exceptionally well.
  - Focus on HOW they answered, not just WHAT they have done.
- improvements: At least 2 actionable improvement suggestions.
  - Focus on **speaking pace, structure (STAR method), clarity, or specific missing details** in their answers.
  - Do NOT say "gain more experience in X". Instead say "When describing X, explain the challenges you faced more clearly."

## Scoring Guidelines (STRICTLY FOLLOW)
- **0-25 (Critical Fail)**: Almost no meaningful content, silent, or one-word answers.
- **26-45 (Poor)**: Very short, non-substantive answers.
- **46-65 (Weak)**: Answers touch on the topic but are vague or lack structure.
- **66-85 (Average)**: Relevant but generic.
- **86-100 (Good)**: Clear, structured, specific examples.

${
  isZhTW
    ? 'Output all text content in Traditional Chinese (繁體中文). Use Markdown for lists (e.g., - Point 1).'
    : 'Output all text content in English. Use Markdown for lists (e.g., - Point 1).'
}`;
}

function buildModelAnswerPrompt(
  transcripts: TranscriptEntry[],
  jobDescription: JobDescription | null | undefined,
  resume: ResumeContent | null | undefined,
  language: 'en' | 'zh-TW'
): string {
  const isZhTW = language === 'zh-TW';
  const jdSection = jobDescription
    ? `\n## Target Position\n${formatJobDescription(jobDescription)}\n`
    : '';
  const resumeSection = resume ? `\n## Candidate Background\n${formatResume(resume)}\n` : '';

  const modelAnswerInstruction = resume
    ? isZhTW
      ? '根據候選人的實際經歷與技能，模擬他/她能夠給出的最佳回答。答案應該真實反映候選人的背景，不要編造經歷。'
      : "Based on the candidate's actual experience and skills, simulate the best possible answers they could give. Answers should reflect the candidate's real background without fabricating experience."
    : isZhTW
      ? '提供專業且有說服力的理想回答範例。'
      : 'Provide professional and compelling ideal answer examples.';

  return `You are an expert interview coach generating a model answer transcript.
${jdSection}${resumeSection}
## Interview Transcript
${formatTranscripts(transcripts)}

## Requirements
- modelTranscript: A generated transcript that mirrors the input transcript structure EXACTLY.
  - STRICTLY maintain the same number of turns and order as the input transcript.
  - For role "interviewer": COPY the text EXACTLY from the input transcript. Do NOT rephrase.
  - For role "candidate": Generate a concise, ideal response to the preceding question.
  - Do NOT extend the interview. Do NOT add new questions.
  - ${modelAnswerInstruction}

${
  isZhTW
    ? 'Output all text content in Traditional Chinese (繁體中文).'
    : 'Output all text content in English.'
}`;
}
