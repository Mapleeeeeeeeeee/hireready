/**
 * Base JD Provider abstract class
 * Provides common functionality for all job board providers
 */

import type { Result } from '@/lib/utils/result';
import { Ok, Err } from '@/lib/utils/result';
import { NetworkError, BadRequestError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import type { JobDescription } from '../types';
import type { JDProvider, ProviderConfig } from './types';
import { DEFAULT_PROVIDER_CONFIG } from './types';

/**
 * Abstract base class for JD providers
 * Implements common logic for URL handling and HTTP requests
 */
export abstract class BaseJDProvider implements JDProvider {
  abstract readonly name: string;
  abstract readonly supportedDomains: string[];

  protected readonly config: Required<ProviderConfig>;

  constructor(config?: ProviderConfig) {
    this.config = { ...DEFAULT_PROVIDER_CONFIG, ...config };
  }

  /**
   * Check if this provider can handle the given URL
   */
  canHandle(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      return this.supportedDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse job description from URL - must be implemented by subclasses
   */
  abstract parse(url: string): Promise<Result<JobDescription>>;

  /**
   * Make an HTTP GET request with proper error handling
   */
  protected async fetchWithTimeout(url: string, options?: RequestInit): Promise<Result<Response>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.config.headers,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        logger.warn(`HTTP request failed: ${response.status}`, {
          module: 'jd-provider',
          action: 'fetch',
          provider: this.name,
          url,
          status: response.status,
        });
        return Err(
          new NetworkError(`HTTP ${response.status}: ${response.statusText}`, response.status)
        );
      }

      return Ok(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('Request timeout', {
          module: 'jd-provider',
          action: 'fetch',
          provider: this.name,
          url,
          timeout: this.config.timeout,
        });
        return Err(new NetworkError('Request timeout', 408));
      }

      logger.error('Network error', error instanceof Error ? error : new Error(String(error)), {
        module: 'jd-provider',
        action: 'fetch',
        provider: this.name,
        url,
      });
      return Err(new NetworkError(error instanceof Error ? error.message : 'Network error'));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch and parse JSON response
   */
  protected async fetchJson<T>(url: string, options?: RequestInit): Promise<Result<T>> {
    const responseResult = await this.fetchWithTimeout(url, options);

    if (!responseResult.ok) {
      return responseResult;
    }

    try {
      const data = (await responseResult.value.json()) as T;
      return Ok(data);
    } catch (error) {
      logger.error('JSON parse error', error instanceof Error ? error : new Error(String(error)), {
        module: 'jd-provider',
        action: 'parseJson',
        provider: this.name,
        url,
      });
      return Err(new BadRequestError('Invalid JSON response'));
    }
  }

  /**
   * Fetch HTML content as text
   */
  protected async fetchHtml(url: string, options?: RequestInit): Promise<Result<string>> {
    const responseResult = await this.fetchWithTimeout(url, options);

    if (!responseResult.ok) {
      return responseResult;
    }

    try {
      const html = await responseResult.value.text();
      return Ok(html);
    } catch (error) {
      logger.error('HTML parse error', error instanceof Error ? error : new Error(String(error)), {
        module: 'jd-provider',
        action: 'parseHtml',
        provider: this.name,
        url,
      });
      return Err(new BadRequestError('Failed to read HTML response'));
    }
  }

  /**
   * Extract a value from HTML using regex
   * Returns undefined if not found
   */
  protected extractFromHtml(html: string, regex: RegExp): string | undefined {
    const match = html.match(regex);
    return match?.[1]?.trim();
  }

  /**
   * Sanitize and decode HTML entities in text
   */
  protected decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
      '&#x2F;': '/',
      '&#x27;': "'",
    };

    let decoded = text;
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), char);
    }

    // Handle numeric entities
    decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );

    return decoded;
  }

  /**
   * Strip HTML tags from text
   */
  protected stripHtmlTags(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
