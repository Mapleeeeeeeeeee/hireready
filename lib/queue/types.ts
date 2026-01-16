/**
 * Queue types and interfaces for background job processing
 */

// Queue names
export const QUEUE_NAMES = {
  INTERVIEW_ANALYSIS: 'interview-analysis',
  RESUME_PARSING: 'resume-parsing',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Task status
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Task types
export type TaskType = 'interview_analysis' | 'resume_parsing';

// Interview analysis job data
export interface InterviewAnalysisJobData {
  taskId: string;
  userId: string;
  interviewId: string;
}

// Resume parsing job data
export interface ResumeParsingJobData {
  taskId: string;
  userId: string;
  resumeUrl: string;
  resumeFileName: string;
}

// Union type for all job data
export type JobData = InterviewAnalysisJobData | ResumeParsingJobData;

// Job result types
export interface InterviewAnalysisResult {
  score: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
}

export interface ResumeParsingResult {
  content: string;
  parsedAt: string;
}

export type JobResult = InterviewAnalysisResult | ResumeParsingResult;
