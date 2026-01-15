/**
 * Format utility function tests
 */

import { describe, it, expect } from 'vitest';
import { formatDuration } from './format';

describe('formatDuration', () => {
  describe('Basic Formatting', () => {
    it('should format zero seconds correctly', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    it('should format single-digit minutes and seconds with leading zeros', () => {
      expect(formatDuration(65)).toBe('01:05');
    });

    it('should format double-digit minutes and seconds correctly', () => {
      expect(formatDuration(665)).toBe('11:05');
    });

    it('should format exactly one minute correctly', () => {
      expect(formatDuration(60)).toBe('01:00');
    });

    it('should format 2 minutes 30 seconds correctly', () => {
      expect(formatDuration(150)).toBe('02:30');
    });

    it('should format 59 seconds correctly', () => {
      expect(formatDuration(59)).toBe('00:59');
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative duration gracefully', () => {
      expect(formatDuration(-10)).toBe('00:00');
      expect(formatDuration(-100)).toBe('00:00');
    });

    it('should handle very large durations (hours)', () => {
      expect(formatDuration(3600)).toBe('60:00'); // 1 hour
      expect(formatDuration(7200)).toBe('120:00'); // 2 hours
    });

    it('should handle decimal values by flooring', () => {
      expect(formatDuration(65.7)).toBe('01:05');
      expect(formatDuration(65.2)).toBe('01:05');
    });

    it('should handle very large numbers', () => {
      expect(formatDuration(86400)).toBe('1440:00'); // 24 hours
    });
  });

  describe('Boundary Values', () => {
    it('should handle 1 second correctly', () => {
      expect(formatDuration(1)).toBe('00:01');
    });

    it('should handle 59 minutes 59 seconds correctly', () => {
      expect(formatDuration(3599)).toBe('59:59');
    });

    it('should handle 100 minutes correctly', () => {
      expect(formatDuration(6000)).toBe('100:00');
    });
  });
});
