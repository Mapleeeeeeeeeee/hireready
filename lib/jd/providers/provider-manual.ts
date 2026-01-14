/**
 * Manual Input Provider
 * Creates JobDescription from user-provided text input
 */

import type { Result } from '@/lib/utils/result';
import { Ok } from '@/lib/utils/result';
import { logger } from '@/lib/utils/logger';
import type { JobDescription, ManualJobInput } from '../types';
import type { JDProvider } from './types';

/**
 * Provider for manual job description input
 * This provider doesn't fetch from external sources but creates JobDescription from user input
 */
export class ManualProvider implements JDProvider {
  readonly name = 'manual';
  readonly supportedDomains: string[] = [];

  /**
   * Manual provider cannot handle URLs
   */
  canHandle(): boolean {
    return false;
  }

  /**
   * Parse is not applicable for manual provider
   * Use createJobDescription instead
   */
  async parse(): Promise<Result<JobDescription>> {
    // This method is required by the interface but not used for manual input
    // Users should call createJobDescription directly
    return Ok(this.createJobDescription({ title: '', company: '', description: '' }));
  }

  /**
   * Create a JobDescription from manual input
   */
  createJobDescription(input: ManualJobInput): JobDescription {
    logger.debug('Creating manual job description', {
      module: 'jd-provider',
      action: 'createManual',
      provider: this.name,
      title: input.title,
    });

    return {
      source: 'manual',
      title: input.title,
      company: input.company,
      description: input.description,
      location: input.location,
      salary: input.salary,
      requirements: input.requirements,
      benefits: input.benefits,
      rawData: input.rawData,
      fetchedAt: new Date(),
    };
  }

  /**
   * Create a JobDescription from plain text
   * Attempts to extract title and company from the text
   */
  createFromText(text: string, defaultTitle?: string): JobDescription {
    const lines = text
      .trim()
      .split('\n')
      .filter((line) => line.trim());

    // Try to extract title from first line if it looks like a title
    let title = defaultTitle || 'Untitled Position';
    let company = 'Unknown Company';
    let description = text;

    if (lines.length > 0) {
      const firstLine = lines[0].trim();

      // Check if first line looks like a job title (short, no special chars)
      if (firstLine.length < 100 && !firstLine.includes('：') && !firstLine.includes(':')) {
        title = firstLine;
        description = lines.slice(1).join('\n').trim() || text;
      }
    }

    // Try to extract company name from common patterns
    const companyPatterns = [
      /公司[名稱]*[：:]\s*(.+)/,
      /Company[：:\s]*(.+)/i,
      /企業[：:]\s*(.+)/,
      /^(.+?)\s*(?:股份有限公司|有限公司|公司)$/m,
    ];

    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        company = match[1].trim();
        break;
      }
    }

    logger.info('Created job description from text', {
      module: 'jd-provider',
      action: 'createFromText',
      provider: this.name,
      title,
      company,
    });

    return {
      source: 'manual',
      title,
      company,
      description,
      fetchedAt: new Date(),
    };
  }
}

/**
 * Create a new manual provider instance
 */
export function createManualProvider(): ManualProvider {
  return new ManualProvider();
}

/**
 * Singleton instance for convenience
 */
export const manualProvider = new ManualProvider();
