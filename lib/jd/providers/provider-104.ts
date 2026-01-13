/**
 * 104 Job Bank Provider
 * Parses job descriptions from 104.com.tw
 */

import type { Result } from '@/lib/utils/result';
import { Ok, Err } from '@/lib/utils/result';
import { BadRequestError, NotFoundError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import type { JobDescription } from '../types';
import type { ProviderConfig } from './types';
import { BaseJDProvider } from './base-provider';

/**
 * 104 API response structure (partial)
 */
interface Job104ApiResponse {
  data: {
    header: {
      jobName: string;
      custName: string;
      coIndustryDesc?: string;
    };
    jobDetail: {
      jobDescription?: string;
      jobOther?: string;
      addressRegion?: string;
      addressDetail?: string;
    };
    condition: {
      acceptRole?: {
        role?: Array<{ description?: string }>;
      };
      specialty?: Array<{ description?: string }>;
      skill?: Array<{ description?: string }>;
      certificate?: Array<{ description?: string }>;
      language?: Array<{
        language?: string;
        ability?: string | { description?: string };
      }>;
      workExp?: string;
      edu?: string;
      major?: Array<{ description?: string }>;
      other?: string;
    };
    welfare: {
      salary?: string;
      salaryDesc?: string;
      welfare?: string;
      legalTag?: Array<{ description?: string }>;
      publicWelfare?: Array<{ description?: string }>;
    };
  };
}

/**
 * Provider for 104.com.tw job board
 */
export class Provider104 extends BaseJDProvider {
  readonly name = '104';
  readonly supportedDomains = ['104.com.tw', 'www.104.com.tw'];

  private static readonly JOB_URL_PATTERN = /\/job\/([a-zA-Z0-9]+)/;
  private static readonly API_BASE = 'https://www.104.com.tw/job/ajax/content';

  constructor(config?: ProviderConfig) {
    super({
      ...config,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'X-Requested-With': 'XMLHttpRequest',
        ...config?.headers,
      },
    });
  }

  /**
   * Extract job ID from 104 URL
   */
  private extractJobId(url: string): string | null {
    const match = url.match(Provider104.JOB_URL_PATTERN);
    return match?.[1] ?? null;
  }

  /**
   * Parse job description from 104 URL
   */
  async parse(url: string): Promise<Result<JobDescription>> {
    const jobId = this.extractJobId(url);

    if (!jobId) {
      logger.warn('Invalid 104 job URL', {
        module: 'jd-provider',
        action: 'parse',
        provider: this.name,
        url,
      });
      return Err(new BadRequestError('Invalid 104 job URL format'));
    }

    const apiUrl = `${Provider104.API_BASE}/${jobId}`;

    logger.debug('Fetching 104 job data', {
      module: 'jd-provider',
      action: 'parse',
      provider: this.name,
      jobId,
    });

    const result = await this.fetchJson<Job104ApiResponse>(apiUrl, {
      headers: {
        Referer: url,
      },
    });

    if (!result.ok) {
      return result;
    }

    const apiData = result.value;

    if (!apiData.data) {
      logger.warn('Job not found on 104', {
        module: 'jd-provider',
        action: 'parse',
        provider: this.name,
        jobId,
      });
      return Err(new NotFoundError('Job posting'));
    }

    const jobDescription = this.mapToJobDescription(apiData.data, url);

    logger.info('Successfully parsed 104 job', {
      module: 'jd-provider',
      action: 'parse',
      provider: this.name,
      jobId,
      title: jobDescription.title,
    });

    return Ok(jobDescription);
  }

  /**
   * Map 104 API response to JobDescription
   */
  private mapToJobDescription(data: Job104ApiResponse['data'], url: string): JobDescription {
    const { header, jobDetail, condition, welfare } = data;

    // Build requirements list
    const requirements: string[] = [];

    if (condition.workExp) {
      requirements.push(`Work Experience: ${condition.workExp}`);
    }

    if (condition.edu) {
      requirements.push(`Education: ${condition.edu}`);
    }

    if (condition.specialty?.length) {
      const specialties = condition.specialty
        .map((s) => s.description)
        .filter(Boolean)
        .join(', ');
      if (specialties) {
        requirements.push(`Specialties: ${specialties}`);
      }
    }

    if (condition.skill?.length) {
      const skills = condition.skill
        .map((s) => s.description)
        .filter(Boolean)
        .join(', ');
      if (skills) {
        requirements.push(`Skills: ${skills}`);
      }
    }

    if (condition.language?.length) {
      const languages = condition.language
        .map((l) => {
          const ability = typeof l.ability === 'object' ? l.ability?.description : l.ability;
          return ability ? `${l.language} (${ability})` : l.language;
        })
        .filter(Boolean)
        .join(', ');
      if (languages) {
        requirements.push(`Languages: ${languages}`);
      }
    }

    if (condition.certificate?.length) {
      const certs = condition.certificate
        .map((c) => c.description)
        .filter(Boolean)
        .join(', ');
      if (certs) {
        requirements.push(`Certificates: ${certs}`);
      }
    }

    if (condition.other) {
      requirements.push(`Other Requirements: ${condition.other}`);
    }

    // Build benefits list
    const benefits: string[] = [];

    if (welfare.legalTag?.length) {
      benefits.push(
        ...welfare.legalTag.map((t) => t.description).filter((d): d is string => Boolean(d))
      );
    }

    if (welfare.publicWelfare?.length) {
      benefits.push(
        ...welfare.publicWelfare.map((w) => w.description).filter((d): d is string => Boolean(d))
      );
    }

    if (welfare.welfare) {
      // Split welfare text by common delimiters
      const welfareItems = welfare.welfare
        .split(/[,、，]/)
        .map((item) => item.trim())
        .filter(Boolean);
      benefits.push(...welfareItems);
    }

    // Build location
    const location = [jobDetail.addressRegion, jobDetail.addressDetail].filter(Boolean).join(' ');

    // Build description
    const descriptionParts: string[] = [];
    if (jobDetail.jobDescription) {
      descriptionParts.push(jobDetail.jobDescription);
    }
    if (jobDetail.jobOther) {
      descriptionParts.push(`\n\nOther Information:\n${jobDetail.jobOther}`);
    }

    const jobDescription: JobDescription = {
      source: '104',
      url,
      title: header.jobName,
      company: header.custName,
      location: location || undefined,
      salary: welfare.salaryDesc || welfare.salary || undefined,
      description: descriptionParts.join('') || header.jobName,
      requirements: requirements.length > 0 ? requirements : undefined,
      benefits: benefits.length > 0 ? benefits : undefined,
      rawData: this.config.includeRawData ? { data } : undefined,
      fetchedAt: new Date(),
    };

    return jobDescription;
  }
}

/**
 * Create a new 104 provider instance
 */
export function create104Provider(config?: ProviderConfig): Provider104 {
  return new Provider104(config);
}
