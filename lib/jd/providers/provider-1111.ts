/**
 * 1111 Job Bank Provider
 * Parses job descriptions from 1111.com.tw
 * Note: 1111 does not have a public JSON API, so we parse HTML meta tags
 */

import type { Result } from '@/lib/utils/result';
import { Ok, Err } from '@/lib/utils/result';
import { BadRequestError, NotFoundError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import type { JobDescription } from '../types';
import type { ProviderConfig } from './types';
import { BaseJDProvider } from './base-provider';

/**
 * Provider for 1111.com.tw job board
 */
export class Provider1111 extends BaseJDProvider {
  readonly name = '1111';
  readonly supportedDomains = ['1111.com.tw', 'www.1111.com.tw'];

  private static readonly JOB_URL_PATTERN = /\/job\/(\d+)/;

  constructor(config?: ProviderConfig) {
    super({
      ...config,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        ...config?.headers,
      },
    });
  }

  /**
   * Validate 1111 URL format
   */
  private isValidJobUrl(url: string): boolean {
    return Provider1111.JOB_URL_PATTERN.test(url);
  }

  /**
   * Parse job description from 1111 URL
   */
  async parse(url: string): Promise<Result<JobDescription>> {
    if (!this.isValidJobUrl(url)) {
      logger.warn('Invalid 1111 job URL', {
        module: 'jd-provider',
        action: 'parse',
        provider: this.name,
        url,
      });
      return Err(new BadRequestError('Invalid 1111 job URL format'));
    }

    logger.debug('Fetching 1111 job data', {
      module: 'jd-provider',
      action: 'parse',
      provider: this.name,
      url,
    });

    const result = await this.fetchHtml(url);

    if (!result.ok) {
      return result;
    }

    const html = result.value;

    // Check for 404 or invalid page
    if (html.includes('找不到此頁面') || html.includes('此職缺已關閉')) {
      logger.warn('Job not found on 1111', {
        module: 'jd-provider',
        action: 'parse',
        provider: this.name,
        url,
      });
      return Err(new NotFoundError('Job posting'));
    }

    const jobDescription = this.parseHtmlToJobDescription(html, url);

    if (!jobDescription) {
      logger.warn('Failed to parse 1111 job page', {
        module: 'jd-provider',
        action: 'parse',
        provider: this.name,
        url,
      });
      return Err(new BadRequestError('Failed to parse job page'));
    }

    logger.info('Successfully parsed 1111 job', {
      module: 'jd-provider',
      action: 'parse',
      provider: this.name,
      title: jobDescription.title,
    });

    return Ok(jobDescription);
  }

  /**
   * Parse HTML content to JobDescription
   * og:title format: "職位 | 公司 | 地點 | 日期 | 1111人力銀行"
   */
  private parseHtmlToJobDescription(html: string, url: string): JobDescription | null {
    // Extract meta tags
    const ogTitle = this.extractMetaContent(html, 'og:title');
    const ogDescription = this.extractMetaContent(html, 'og:description');
    const metaDescription = this.extractMetaContent(html, 'description');

    if (!ogTitle) {
      return null;
    }

    // Parse og:title format: "職位 | 公司 | 地點 | 日期 | 1111人力銀行"
    const titleParts = ogTitle.split('|').map((part) => part.trim());

    if (titleParts.length < 2) {
      return null;
    }

    const title = titleParts[0];
    const company = titleParts[1];
    const location = titleParts.length > 2 ? titleParts[2] : undefined;

    // Extract salary from description if present
    const salary = this.extractSalary(ogDescription || metaDescription || '');

    // Use og:description or meta description as job description
    let description = ogDescription || metaDescription || '';
    description = this.decodeHtmlEntities(description);

    // Try to extract more detailed job description from HTML
    const detailedDescription = this.extractDetailedDescription(html);
    if (detailedDescription) {
      description = detailedDescription;
    }

    // Extract requirements from HTML
    const requirements = this.extractRequirements(html);

    // Extract benefits from HTML
    const benefits = this.extractBenefits(html);

    const jobDescription: JobDescription = {
      source: '1111',
      url,
      title,
      company,
      location: location !== '1111人力銀行' ? location : undefined,
      salary: salary || undefined,
      description: description || title,
      requirements: requirements.length > 0 ? requirements : undefined,
      benefits: benefits.length > 0 ? benefits : undefined,
      rawData: this.config.includeRawData ? { ogTitle, ogDescription, metaDescription } : undefined,
      fetchedAt: new Date(),
    };

    return jobDescription;
  }

  /**
   * Extract meta tag content
   */
  private extractMetaContent(html: string, name: string): string | undefined {
    // Try og: prefix first
    const ogPattern = new RegExp(
      `<meta\\s+(?:property|name)=["'](?:og:)?${name}["']\\s+content=["']([^"']*)["']`,
      'i'
    );
    const ogMatch = html.match(ogPattern);
    if (ogMatch?.[1]) {
      return this.decodeHtmlEntities(ogMatch[1]);
    }

    // Try reversed attribute order
    const reversePattern = new RegExp(
      `<meta\\s+content=["']([^"']*)["']\\s+(?:property|name)=["'](?:og:)?${name}["']`,
      'i'
    );
    const reverseMatch = html.match(reversePattern);
    if (reverseMatch?.[1]) {
      return this.decodeHtmlEntities(reverseMatch[1]);
    }

    return undefined;
  }

  /**
   * Extract salary information from text
   */
  private extractSalary(text: string): string | null {
    // Common salary patterns in Taiwan
    const patterns = [
      /月薪[：:\s]*([0-9,]+(?:\s*[-~至]\s*[0-9,]+)?(?:\s*元)?)/,
      /年薪[：:\s]*([0-9,]+(?:\s*[-~至]\s*[0-9,]+)?(?:\s*萬)?)/,
      /時薪[：:\s]*([0-9,]+(?:\s*[-~至]\s*[0-9,]+)?(?:\s*元)?)/,
      /薪資[：:\s]*([^\n,，]+)/,
      /待遇[：:\s]*([^\n,，]+)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract detailed job description from HTML
   */
  private extractDetailedDescription(html: string): string | null {
    // Try to find job description section
    const patterns = [
      /<div[^>]*class="[^"]*job-?description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<section[^>]*class="[^"]*job-?content[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
      /<div[^>]*id="[^"]*job-?desc[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const text = this.stripHtmlTags(match[1]);
        if (text.length > 50) {
          return text;
        }
      }
    }

    return null;
  }

  /**
   * Extract job requirements from HTML
   */
  private extractRequirements(html: string): string[] {
    const requirements: string[] = [];

    // Try to find requirements section
    const sectionPatterns = [
      /<div[^>]*class="[^"]*requirement[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<section[^>]*class="[^"]*condition[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
    ];

    for (const pattern of sectionPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const text = this.stripHtmlTags(match[1]);
        if (text.length > 10) {
          // Split by common delimiters and add each item
          const items = text.split(/[。\n]/).filter((item) => item.trim().length > 5);
          requirements.push(...items.map((item) => item.trim()));
        }
      }
    }

    return requirements.slice(0, 10); // Limit to 10 items
  }

  /**
   * Extract job benefits from HTML
   */
  private extractBenefits(html: string): string[] {
    const benefits: string[] = [];

    // Try to find welfare/benefits section
    const sectionPatterns = [
      /<div[^>]*class="[^"]*welfare[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*benefit[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    ];

    for (const pattern of sectionPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const text = this.stripHtmlTags(match[1]);
        if (text.length > 10) {
          // Split by common delimiters
          const items = text.split(/[、,，]/).filter((item) => item.trim().length > 2);
          benefits.push(...items.map((item) => item.trim()));
        }
      }
    }

    return benefits.slice(0, 15); // Limit to 15 items
  }
}

/**
 * Create a new 1111 provider instance
 */
export function create1111Provider(config?: ProviderConfig): Provider1111 {
  return new Provider1111(config);
}
