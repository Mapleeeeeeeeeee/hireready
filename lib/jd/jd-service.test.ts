import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  JDService,
  parseJobUrl,
  createManualJob,
  createFromText,
  parseJobFromText,
} from './jd-service';
import type { JobDescription, ManualJobInput } from './types';

// Mock the providers module
vi.mock('./providers', () => ({
  getProviderFactory: vi.fn(() => ({
    getProviderForUrl: vi.fn((url: string) => {
      if (url.includes('104.com.tw')) {
        return {
          parse: vi.fn().mockResolvedValue({
            ok: true,
            value: {
              source: '104',
              title: 'Frontend Engineer',
              company: 'Test Company',
              description: 'Job description',
              fetchedAt: new Date(),
            } as JobDescription,
          }),
        };
      }
      if (url.includes('1111.com.tw')) {
        return {
          parse: vi.fn().mockResolvedValue({
            ok: true,
            value: {
              source: '1111',
              title: 'Backend Engineer',
              company: 'Another Company',
              description: 'Backend job description',
              fetchedAt: new Date(),
            } as JobDescription,
          }),
        };
      }
      return null;
    }),
  })),
  isUrlSupported: vi.fn((url: string) => {
    return url.includes('104.com.tw') || url.includes('1111.com.tw');
  }),
  getSupportedDomains: vi.fn(() => ['104.com.tw', '1111.com.tw']),
  manualProvider: {
    createJobDescription: vi.fn((input: ManualJobInput) => ({
      source: 'manual' as const,
      title: input.title,
      company: input.company,
      description: input.description,
      fetchedAt: new Date(),
    })),
    createFromText: vi.fn((text: string, defaultTitle?: string) => ({
      source: 'manual' as const,
      title: defaultTitle || 'Untitled Position',
      company: 'Unknown',
      description: text,
      fetchedAt: new Date(),
    })),
  },
}));

// Mock validators
vi.mock('./validators', () => ({
  isValidJobUrl: vi.fn((url: string) => {
    try {
      new URL(url);
      return url.includes('104.com.tw') || url.includes('1111.com.tw');
    } catch {
      return false;
    }
  }),
  parseJobUrl: vi.fn((url: string) => {
    try {
      const parsed = new URL(url);
      if (url.includes('104.com.tw')) {
        return {
          url,
          source: '104',
          jobId: 'abc123',
          hostname: parsed.hostname,
        };
      }
      if (url.includes('1111.com.tw')) {
        return {
          url,
          source: '1111',
          jobId: '12345',
          hostname: parsed.hostname,
        };
      }
      return null;
    } catch {
      return null;
    }
  }),
}));

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('JDService', () => {
  let service: JDService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new JDService();
  });

  describe('parseJobUrl', () => {
    it('should return error for invalid URL format', async () => {
      const result = await service.parseJobUrl('not-a-url');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid URL format');
      }
    });

    it('should return error for unsupported domain', async () => {
      const result = await service.parseJobUrl('https://unsupported.com/job/123');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Unsupported domains fail isValidJobUrl check first
        expect(result.error.message).toContain('Invalid URL format');
      }
    });

    it('should parse 104.com.tw URLs successfully', async () => {
      const result = await service.parseJobUrl('https://www.104.com.tw/job/abc123');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.source).toBe('104');
        expect(result.value.title).toBe('Frontend Engineer');
      }
    });

    it('should parse 1111.com.tw URLs successfully', async () => {
      const result = await service.parseJobUrl('https://www.1111.com.tw/job/12345');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.source).toBe('1111');
        expect(result.value.title).toBe('Backend Engineer');
      }
    });
  });

  describe('createManualJob', () => {
    it('should create a manual job description', () => {
      const input: ManualJobInput = {
        title: 'Senior Developer',
        company: 'Tech Corp',
        description: 'We are looking for a senior developer',
      };

      const result = service.createManualJob(input);

      expect(result.source).toBe('manual');
      expect(result.title).toBe('Senior Developer');
      expect(result.company).toBe('Tech Corp');
      expect(result.description).toBe('We are looking for a senior developer');
      expect(result.fetchedAt).toBeInstanceOf(Date);
    });
  });

  describe('createFromText', () => {
    it('should create job description from plain text', () => {
      const text = 'Looking for a React developer to join our team.';
      const result = service.createFromText(text);

      expect(result.source).toBe('manual');
      expect(result.description).toBe(text);
      expect(result.fetchedAt).toBeInstanceOf(Date);
    });

    it('should use provided default title', () => {
      const text = 'Job description content';
      const result = service.createFromText(text, 'Custom Title');

      expect(result.title).toBe('Custom Title');
    });
  });

  describe('isUrlSupported', () => {
    it('should return true for supported URLs', () => {
      expect(service.isUrlSupported('https://www.104.com.tw/job/abc')).toBe(true);
      expect(service.isUrlSupported('https://www.1111.com.tw/job/123')).toBe(true);
    });

    it('should return false for unsupported URLs', () => {
      expect(service.isUrlSupported('https://example.com/job/123')).toBe(false);
    });
  });

  describe('getSupportedDomains', () => {
    it('should return list of supported domains', () => {
      const domains = service.getSupportedDomains();
      expect(domains).toContain('104.com.tw');
      expect(domains).toContain('1111.com.tw');
    });
  });

  describe('parseUrl', () => {
    it('should parse valid job URL', () => {
      const result = service.parseUrl('https://www.104.com.tw/job/abc123');
      expect(result).toBeTruthy();
      expect(result?.source).toBe('104');
      expect(result?.jobId).toBe('abc123');
    });

    it('should return null for invalid URL', () => {
      const result = service.parseUrl('not-a-url');
      expect(result).toBeNull();
    });
  });
});

describe('standalone functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseJobUrl', () => {
    it('should parse job URL using default service', async () => {
      const result = await parseJobUrl('https://www.104.com.tw/job/abc123');
      expect(result.ok).toBe(true);
    });
  });

  describe('createManualJob', () => {
    it('should create manual job using default service', () => {
      const input: ManualJobInput = {
        title: 'Test Job',
        company: 'Test Company',
        description: 'Test description',
      };
      const result = createManualJob(input);
      expect(result.source).toBe('manual');
      expect(result.title).toBe('Test Job');
    });
  });

  describe('createFromText', () => {
    it('should create job from text using default service', () => {
      const result = createFromText('Some job description text');
      expect(result.source).toBe('manual');
      expect(result.description).toBe('Some job description text');
    });
  });

  describe('parseJobFromText', () => {
    it('should return Result with job description', () => {
      const result = parseJobFromText('Job description text', 'Developer Position');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.source).toBe('manual');
        expect(result.value.title).toBe('Developer Position');
      }
    });
  });
});
