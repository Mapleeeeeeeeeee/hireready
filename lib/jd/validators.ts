/**
 * URL Validators for JD module
 * Provides validation functions for job board URLs
 */

import type { JDSource } from './types';

/**
 * Parsed job URL information
 */
export interface ParsedJobUrl {
  /** The original URL */
  url: string;
  /** Detected source/provider */
  source: JDSource;
  /** Job ID extracted from URL */
  jobId: string;
  /** Hostname of the URL */
  hostname: string;
}

/**
 * URL patterns for each supported job board
 */
const URL_PATTERNS: Record<string, { source: JDSource; pattern: RegExp }> = {
  '104': {
    source: '104',
    pattern: /\/job\/([a-zA-Z0-9]+)/,
  },
  '1111': {
    source: '1111',
    pattern: /\/job\/(\d+)/,
  },
};

/**
 * Domain to source mapping
 */
const DOMAIN_SOURCE_MAP: Record<string, string> = {
  '104.com.tw': '104',
  'www.104.com.tw': '104',
  '1111.com.tw': '1111',
  'www.1111.com.tw': '1111',
};

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a valid job board URL that we can parse
 */
export function isValidJobUrl(url: string): boolean {
  if (!isValidUrl(url)) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check if domain is supported
    const sourceKey = DOMAIN_SOURCE_MAP[hostname];
    if (!sourceKey) {
      return false;
    }

    // Check if URL matches the expected pattern
    const urlConfig = URL_PATTERNS[sourceKey];
    if (!urlConfig) {
      return false;
    }

    return urlConfig.pattern.test(parsedUrl.pathname);
  } catch {
    return false;
  }
}

/**
 * Parse a job URL and extract information
 * Returns null if the URL is invalid or unsupported
 */
export function parseJobUrl(url: string): ParsedJobUrl | null {
  if (!isValidUrl(url)) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Find the source for this domain
    const sourceKey = DOMAIN_SOURCE_MAP[hostname];
    if (!sourceKey) {
      return null;
    }

    // Get the URL pattern config
    const urlConfig = URL_PATTERNS[sourceKey];
    if (!urlConfig) {
      return null;
    }

    // Extract job ID
    const match = parsedUrl.pathname.match(urlConfig.pattern);
    if (!match?.[1]) {
      return null;
    }

    return {
      url,
      source: urlConfig.source,
      jobId: match[1],
      hostname,
    };
  } catch {
    return null;
  }
}

/**
 * Get the source/provider for a URL
 * Returns null if the URL is not supported
 */
export function getSourceFromUrl(url: string): JDSource | null {
  const parsed = parseJobUrl(url);
  return parsed?.source ?? null;
}

/**
 * Validate and normalize a job URL
 * Returns the normalized URL or null if invalid
 */
export function normalizeJobUrl(url: string): string | null {
  if (!isValidUrl(url)) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    // Remove tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'from'];
    trackingParams.forEach((param) => {
      parsedUrl.searchParams.delete(param);
    });

    // Return the cleaned URL
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

/**
 * Extract job ID from a URL for a specific source
 */
export function extractJobId(url: string, source?: JDSource): string | null {
  const parsed = parseJobUrl(url);

  if (!parsed) {
    return null;
  }

  // If source is specified, verify it matches
  if (source && parsed.source !== source) {
    return null;
  }

  return parsed.jobId;
}

/**
 * Build a canonical job URL from source and job ID
 */
export function buildJobUrl(source: JDSource, jobId: string): string | null {
  switch (source) {
    case '104':
      return 'https://www.104.com.tw/job/' + jobId;
    case '1111':
      return 'https://www.1111.com.tw/job/' + jobId;
    case 'manual':
      return null; // Manual entries don't have URLs
    default:
      return null;
  }
}

/**
 * Get all supported domains
 */
export function getSupportedDomains(): string[] {
  return Object.keys(DOMAIN_SOURCE_MAP);
}

/**
 * Check if a domain is supported
 */
export function isDomainSupported(domain: string): boolean {
  return domain.toLowerCase() in DOMAIN_SOURCE_MAP;
}
