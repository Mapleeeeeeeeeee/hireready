/**
 * JD Service - Unified entry point for job description operations
 * Provides high-level API for parsing and managing job descriptions
 */

import type { Result } from '@/lib/utils/result';
import { Ok, Err, withErrorHandling } from '@/lib/utils/result';
import { BadRequestError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import type { JobDescription, ManualJobInput } from './types';
import {
  getProviderFactory,
  isUrlSupported,
  getSupportedDomains,
  manualProvider,
  type ProviderConfig,
} from './providers';
import { isValidJobUrl, parseJobUrl as parseUrl, type ParsedJobUrl } from './validators';

/**
 * JD Service class providing all job description operations
 */
export class JDService {
  private config?: ProviderConfig;

  constructor(config?: ProviderConfig) {
    this.config = config;
  }

  /**
   * Parse a job description from a URL
   * Automatically selects the appropriate provider based on the URL
   */
  async parseJobUrl(url: string): Promise<Result<JobDescription>> {
    logger.info('Parsing job URL', {
      module: 'jd-service',
      action: 'parseJobUrl',
      url,
    });

    // Validate URL format
    if (!isValidJobUrl(url)) {
      logger.warn('Invalid URL format', {
        module: 'jd-service',
        action: 'parseJobUrl',
        url,
      });
      return Err(new BadRequestError('Invalid URL format'));
    }

    // Get the appropriate provider
    const factory = getProviderFactory(this.config);
    const provider = factory.getProviderForUrl(url);

    if (!provider) {
      const domains = getSupportedDomains();
      logger.warn('Unsupported job board URL', {
        module: 'jd-service',
        action: 'parseJobUrl',
        url,
        supportedDomains: domains,
      });
      return Err(
        new BadRequestError('Unsupported job board. Supported sites: ' + domains.join(', '))
      );
    }

    // Parse the job description
    return provider.parse(url);
  }

  /**
   * Create a job description from manual input
   */
  createManualJob(input: ManualJobInput): JobDescription {
    logger.info('Creating manual job description', {
      module: 'jd-service',
      action: 'createManualJob',
      title: input.title,
    });

    return manualProvider.createJobDescription(input);
  }

  /**
   * Create a job description from plain text
   * Attempts to extract title and company from the text
   */
  createFromText(text: string, defaultTitle?: string): JobDescription {
    logger.info('Creating job description from text', {
      module: 'jd-service',
      action: 'createFromText',
      textLength: text.length,
    });

    return manualProvider.createFromText(text, defaultTitle);
  }

  /**
   * Check if a URL is supported
   */
  isUrlSupported(url: string): boolean {
    return isUrlSupported(url);
  }

  /**
   * Get all supported domains
   */
  getSupportedDomains(): string[] {
    return getSupportedDomains();
  }

  /**
   * Parse a URL to extract provider and job ID information
   */
  parseUrl(url: string): ParsedJobUrl | null {
    return parseUrl(url);
  }
}

// ============================================================
// Standalone Functions (for convenience)
// ============================================================

/**
 * Default service instance
 */
let defaultService: JDService | null = null;

/**
 * Get or create the default service instance
 */
function getService(config?: ProviderConfig): JDService {
  if (!defaultService || config) {
    defaultService = new JDService(config);
  }
  return defaultService;
}

/**
 * Parse a job description from a URL
 * Server-side function that can be called from client components
 */
export async function parseJobUrl(url: string): Promise<Result<JobDescription>> {
  return getService().parseJobUrl(url);
}

/**
 * Wrapped version with retry logic for resilience
 */
export const parseJobUrlWithRetry = withErrorHandling(
  async (url: string): Promise<JobDescription> => {
    const result = await parseJobUrl(url);
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  },
  {
    module: 'jd-service',
    action: 'parseJobUrlWithRetry',
  }
);

/**
 * Create a job description from manual input
 */
export function createManualJob(input: ManualJobInput): JobDescription {
  return getService().createManualJob(input);
}

/**
 * Create a job description from plain text
 */
export function createFromText(text: string, defaultTitle?: string): JobDescription {
  return getService().createFromText(text, defaultTitle);
}

// ============================================================
// API Compatibility Aliases
// ============================================================

/**
 * Alias for parseJobUrl - for API route compatibility
 * @alias parseJobUrl
 */
export const parseJobFromUrl = parseJobUrl;

/**
 * Parse job description from text - returns Result for API consistency
 * Wraps createFromText in a Result type
 */
export function parseJobFromText(text: string, defaultTitle?: string): Result<JobDescription> {
  const jd = createFromText(text, defaultTitle);
  return Ok(jd);
}

/**
 * Check if a URL is supported
 */
export { isUrlSupported, getSupportedDomains };

// ============================================================
// Type exports
// ============================================================

export type { JobDescription, ManualJobInput } from './types';
export type { JDProvider, ProviderConfig } from './providers';
