/**
 * Job Description mappers for converting between different data formats
 */

import type { JobDescription, JDSource } from './types';
import type { JobDescriptionData } from '@/lib/types/user';

/**
 * Valid JD sources for type guard
 */
const VALID_JD_SOURCES: JDSource[] = ['manual', '104', '1111'];

/**
 * Type guard to check if a string is a valid JDSource
 */
function isValidJDSource(source: string | undefined): source is JDSource {
  return source !== undefined && VALID_JD_SOURCES.includes(source as JDSource);
}

/**
 * Convert JobDescriptionData (API/DB format) to JobDescription (store format)
 *
 * This mapper handles the conversion from the optional-field API format
 * to the required-field store format, providing sensible defaults.
 *
 * @param data - JobDescriptionData from API or database
 * @returns JobDescription suitable for the interview store
 */
export function toJobDescription(data: JobDescriptionData): JobDescription {
  return {
    source: isValidJDSource(data.source) ? data.source : 'manual',
    url: data.url,
    title: data.title || '',
    company: data.company || '',
    location: data.location,
    salary: data.salary,
    description: data.description || '',
    requirements: data.requirements,
    fetchedAt: new Date(),
  };
}
