/**
 * Job Description (JD) type definitions
 * Used to customize interview questions based on target position
 */

/**
 * Supported job board sources
 */
export type JDSource = 'manual' | '104' | '1111';

/**
 * Job description data structure
 */
export interface JobDescription {
  /** Source of the job description */
  source: JDSource;
  /** Original URL (if fetched from a job board) */
  url?: string;
  /** Job title */
  title: string;
  /** Company name */
  company: string;
  /** Work location */
  location?: string;
  /** Salary range */
  salary?: string;
  /** Job description / responsibilities */
  description: string;
  /** Job requirements / qualifications */
  requirements?: string[];
  /** List of benefits */
  benefits?: string[];
  /** Raw data from the source (for debugging/extension) */
  rawData?: Record<string, unknown>;
  /** Timestamp when the job was fetched/created */
  fetchedAt: Date;
}

/**
 * Partial JobDescription for creating manual entries
 */
export type ManualJobInput = Pick<JobDescription, 'title' | 'company' | 'description'> &
  Partial<Omit<JobDescription, 'source' | 'fetchedAt' | 'title' | 'company' | 'description'>>;

/**
 * Check if a job description has meaningful content
 */
export function hasJobDescriptionContent(jd: JobDescription | null | undefined): boolean {
  if (!jd) return false;
  return Boolean(jd.title || jd.company || jd.description || jd.requirements?.length);
}
