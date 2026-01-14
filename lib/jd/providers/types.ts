/**
 * JD Provider interface definitions
 * Defines the contract for job board parsers
 */

import type { Result } from '@/lib/utils/result';
import type { JobDescription } from '../types';

/**
 * Interface for job description providers
 * Each provider handles a specific job board (104, 1111, etc.)
 */
export interface JDProvider {
  /** Provider name for logging/debugging */
  readonly name: string;
  /** List of domains this provider can handle */
  readonly supportedDomains: string[];

  /**
   * Check if this provider can handle the given URL
   * @param url - The URL to check
   * @returns true if this provider can parse the URL
   */
  canHandle(url: string): boolean;

  /**
   * Parse job description from the given URL
   * @param url - The job posting URL
   * @returns Result containing JobDescription or error
   */
  parse(url: string): Promise<Result<JobDescription>>;
}

/**
 * Configuration options for providers
 */
export interface ProviderConfig {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers to include in requests */
  headers?: Record<string, string>;
  /** Whether to include raw API response in JobDescription.rawData */
  includeRawData?: boolean;
}

/**
 * Default provider configuration
 */
export const DEFAULT_PROVIDER_CONFIG: Required<ProviderConfig> = {
  timeout: 10000,
  headers: {},
  includeRawData: false,
};
