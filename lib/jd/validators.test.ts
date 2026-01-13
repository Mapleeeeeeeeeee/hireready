import { describe, expect, it } from 'vitest';
import {
  isValidUrl,
  isValidJobUrl,
  parseJobUrl,
  getSourceFromUrl,
  normalizeJobUrl,
  extractJobId,
  buildJobUrl,
  getSupportedDomains,
  isDomainSupported,
} from './validators';

describe('validators', () => {
  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://www.example.com/path?query=1')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
    });
  });

  describe('isValidJobUrl', () => {
    it('should return true for valid 104.com.tw job URLs', () => {
      expect(isValidJobUrl('https://www.104.com.tw/job/abc123')).toBe(true);
      expect(isValidJobUrl('https://104.com.tw/job/xyz789')).toBe(true);
    });

    it('should return true for valid 1111.com.tw job URLs', () => {
      expect(isValidJobUrl('https://www.1111.com.tw/job/12345')).toBe(true);
      expect(isValidJobUrl('https://1111.com.tw/job/67890')).toBe(true);
    });

    it('should return false for unsupported domains', () => {
      expect(isValidJobUrl('https://example.com/job/123')).toBe(false);
      expect(isValidJobUrl('https://linkedin.com/jobs/123')).toBe(false);
    });

    it('should return false for invalid URL paths', () => {
      expect(isValidJobUrl('https://www.104.com.tw/company/123')).toBe(false);
      expect(isValidJobUrl('https://www.104.com.tw/')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidJobUrl('not-a-url')).toBe(false);
      expect(isValidJobUrl('')).toBe(false);
    });
  });

  describe('parseJobUrl', () => {
    it('should parse 104.com.tw URLs correctly', () => {
      const result = parseJobUrl('https://www.104.com.tw/job/abc123');
      expect(result).toEqual({
        url: 'https://www.104.com.tw/job/abc123',
        source: '104',
        jobId: 'abc123',
        hostname: 'www.104.com.tw',
      });
    });

    it('should parse 1111.com.tw URLs correctly', () => {
      const result = parseJobUrl('https://www.1111.com.tw/job/12345');
      expect(result).toEqual({
        url: 'https://www.1111.com.tw/job/12345',
        source: '1111',
        jobId: '12345',
        hostname: 'www.1111.com.tw',
      });
    });

    it('should return null for unsupported URLs', () => {
      expect(parseJobUrl('https://example.com/job/123')).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(parseJobUrl('not-a-url')).toBeNull();
    });

    it('should return null for URLs without job ID', () => {
      expect(parseJobUrl('https://www.104.com.tw/company/list')).toBeNull();
    });
  });

  describe('getSourceFromUrl', () => {
    it('should return 104 for 104.com.tw URLs', () => {
      expect(getSourceFromUrl('https://www.104.com.tw/job/abc123')).toBe('104');
    });

    it('should return 1111 for 1111.com.tw URLs', () => {
      expect(getSourceFromUrl('https://www.1111.com.tw/job/12345')).toBe('1111');
    });

    it('should return null for unsupported URLs', () => {
      expect(getSourceFromUrl('https://example.com/job/123')).toBeNull();
    });
  });

  describe('normalizeJobUrl', () => {
    it('should remove tracking parameters', () => {
      const url = 'https://www.104.com.tw/job/abc123?utm_source=google&utm_medium=cpc';
      const normalized = normalizeJobUrl(url);
      expect(normalized).toBe('https://www.104.com.tw/job/abc123');
    });

    it('should preserve non-tracking parameters', () => {
      const url = 'https://www.104.com.tw/job/abc123?page=1';
      const normalized = normalizeJobUrl(url);
      expect(normalized).toBe('https://www.104.com.tw/job/abc123?page=1');
    });

    it('should return null for invalid URLs', () => {
      expect(normalizeJobUrl('not-a-url')).toBeNull();
    });
  });

  describe('extractJobId', () => {
    it('should extract job ID from valid URL', () => {
      expect(extractJobId('https://www.104.com.tw/job/abc123')).toBe('abc123');
      expect(extractJobId('https://www.1111.com.tw/job/12345')).toBe('12345');
    });

    it('should return null for invalid URLs', () => {
      expect(extractJobId('not-a-url')).toBeNull();
    });

    it('should verify source when specified', () => {
      expect(extractJobId('https://www.104.com.tw/job/abc123', '104')).toBe('abc123');
      expect(extractJobId('https://www.104.com.tw/job/abc123', '1111')).toBeNull();
    });
  });

  describe('buildJobUrl', () => {
    it('should build 104.com.tw URL', () => {
      const url = buildJobUrl('104', 'abc123');
      expect(url).toBe('https://www.104.com.tw/job/abc123');
    });

    it('should build 1111.com.tw URL', () => {
      const url = buildJobUrl('1111', '12345');
      expect(url).toBe('https://www.1111.com.tw/job/12345');
    });

    it('should return null for manual source', () => {
      expect(buildJobUrl('manual', 'abc')).toBeNull();
    });
  });

  describe('getSupportedDomains', () => {
    it('should return array of supported domains', () => {
      const domains = getSupportedDomains();
      expect(domains).toContain('104.com.tw');
      expect(domains).toContain('www.104.com.tw');
      expect(domains).toContain('1111.com.tw');
      expect(domains).toContain('www.1111.com.tw');
    });
  });

  describe('isDomainSupported', () => {
    it('should return true for supported domains', () => {
      expect(isDomainSupported('104.com.tw')).toBe(true);
      expect(isDomainSupported('www.104.com.tw')).toBe(true);
      expect(isDomainSupported('1111.com.tw')).toBe(true);
    });

    it('should return false for unsupported domains', () => {
      expect(isDomainSupported('example.com')).toBe(false);
      expect(isDomainSupported('linkedin.com')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isDomainSupported('104.COM.TW')).toBe(true);
      expect(isDomainSupported('WWW.104.COM.TW')).toBe(true);
    });
  });
});
