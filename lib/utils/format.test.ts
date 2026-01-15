/**
 * Format utility function tests
 */

import { describe, it, expect } from 'vitest';
import { formatTimeDisplay } from './format';

describe('formatTimeDisplay', () => {
  describe('Basic Formatting', () => {
    it('should format zero seconds correctly', () => {
      expect(formatTimeDisplay(0)).toBe('00:00');
    });

    it('should format single-digit minutes and seconds with leading zeros', () => {
      expect(formatTimeDisplay(65)).toBe('01:05');
    });

    it('should format double-digit minutes and seconds correctly', () => {
      expect(formatTimeDisplay(665)).toBe('11:05');
    });

    it('should format exactly one minute correctly', () => {
      expect(formatTimeDisplay(60)).toBe('01:00');
    });

    it('should format 2 minutes 30 seconds correctly', () => {
      expect(formatTimeDisplay(150)).toBe('02:30');
    });

    it('should format 59 seconds correctly', () => {
      expect(formatTimeDisplay(59)).toBe('00:59');
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative duration gracefully', () => {
      expect(formatTimeDisplay(-10)).toBe('00:00');
      expect(formatTimeDisplay(-100)).toBe('00:00');
    });

    it('should handle very large durations (hours)', () => {
      expect(formatTimeDisplay(3600)).toBe('60:00'); // 1 hour
      expect(formatTimeDisplay(7200)).toBe('120:00'); // 2 hours
    });

    it('should handle decimal values by flooring', () => {
      expect(formatTimeDisplay(65.7)).toBe('01:05');
      expect(formatTimeDisplay(65.2)).toBe('01:05');
    });

    it('should handle very large numbers', () => {
      expect(formatTimeDisplay(86400)).toBe('1440:00'); // 24 hours
    });
  });

  describe('Boundary Values', () => {
    it('should handle 1 second correctly', () => {
      expect(formatTimeDisplay(1)).toBe('00:01');
    });

    it('should handle 59 minutes 59 seconds correctly', () => {
      expect(formatTimeDisplay(3599)).toBe('59:59');
    });

    it('should handle 100 minutes correctly', () => {
      expect(formatTimeDisplay(6000)).toBe('100:00');
    });
  });
});
