/**
 * Unit tests for resume type utilities
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  isAllowedResumeType,
  getExtensionFromMimeType,
  validateFileSignature,
  getFileTypeFromName,
  RESUME_ALLOWED_TYPES,
} from './types';

describe('Resume Type Utilities', () => {
  describe('isAllowedResumeType', () => {
    it('should accept valid PDF MIME type', () => {
      expect(isAllowedResumeType('application/pdf')).toBe(true);
    });

    it('should accept valid JPEG MIME type', () => {
      expect(isAllowedResumeType('image/jpeg')).toBe(true);
    });

    it('should accept valid PNG MIME type', () => {
      expect(isAllowedResumeType('image/png')).toBe(true);
    });

    it('should reject invalid MIME types', () => {
      expect(isAllowedResumeType('text/plain')).toBe(false);
      expect(isAllowedResumeType('application/json')).toBe(false);
      expect(isAllowedResumeType('image/gif')).toBe(false);
      expect(isAllowedResumeType('application/msword')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isAllowedResumeType('')).toBe(false);
    });

    it('should reject case-sensitive variations', () => {
      expect(isAllowedResumeType('APPLICATION/PDF')).toBe(false);
      expect(isAllowedResumeType('Image/JPEG')).toBe(false);
    });

    it('should accept all defined allowed types', () => {
      for (const type of RESUME_ALLOWED_TYPES) {
        expect(isAllowedResumeType(type)).toBe(true);
      }
    });
  });

  describe('getExtensionFromMimeType', () => {
    it('should return .pdf for application/pdf', () => {
      expect(getExtensionFromMimeType('application/pdf')).toBe('.pdf');
    });

    it('should return .jpg for image/jpeg', () => {
      expect(getExtensionFromMimeType('image/jpeg')).toBe('.jpg');
    });

    it('should return .png for image/png', () => {
      expect(getExtensionFromMimeType('image/png')).toBe('.png');
    });

    it('should return empty string for unknown MIME types', () => {
      expect(getExtensionFromMimeType('text/plain')).toBe('');
      expect(getExtensionFromMimeType('application/json')).toBe('');
      expect(getExtensionFromMimeType('image/gif')).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(getExtensionFromMimeType('')).toBe('');
    });

    it('should return empty string for invalid input', () => {
      expect(getExtensionFromMimeType('not-a-mime-type')).toBe('');
    });
  });

  describe('validateFileSignature', () => {
    describe('PDF validation', () => {
      it('should accept valid PDF signature', () => {
        // %PDF magic number
        const validPdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
        expect(validateFileSignature(validPdf, 'application/pdf')).toBe(true);
      });

      it('should reject invalid PDF signature', () => {
        const invalidPdf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
        expect(validateFileSignature(invalidPdf, 'application/pdf')).toBe(false);
      });
    });

    describe('JPEG validation', () => {
      it('should accept valid JPEG signature', () => {
        // JPEG magic number (FF D8 FF)
        const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
        expect(validateFileSignature(validJpeg, 'image/jpeg')).toBe(true);
      });

      it('should reject invalid JPEG signature', () => {
        const invalidJpeg = Buffer.from([0x00, 0x00, 0x00]);
        expect(validateFileSignature(invalidJpeg, 'image/jpeg')).toBe(false);
      });
    });

    describe('PNG validation', () => {
      it('should accept valid PNG signature', () => {
        // PNG magic number (89 50 4E 47)
        const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        expect(validateFileSignature(validPng, 'image/png')).toBe(true);
      });

      it('should reject invalid PNG signature', () => {
        const invalidPng = Buffer.from([0x00, 0x00, 0x00, 0x00]);
        expect(validateFileSignature(invalidPng, 'image/png')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should reject unknown MIME types', () => {
        const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
        expect(validateFileSignature(buffer, 'text/plain')).toBe(false);
        expect(validateFileSignature(buffer, 'application/json')).toBe(false);
      });

      it('should reject buffer shorter than signature', () => {
        // PDF signature is 4 bytes, provide only 2
        const shortBuffer = Buffer.from([0x25, 0x50]);
        expect(validateFileSignature(shortBuffer, 'application/pdf')).toBe(false);
      });

      it('should reject empty buffer', () => {
        const emptyBuffer = Buffer.from([]);
        expect(validateFileSignature(emptyBuffer, 'application/pdf')).toBe(false);
        expect(validateFileSignature(emptyBuffer, 'image/jpeg')).toBe(false);
        expect(validateFileSignature(emptyBuffer, 'image/png')).toBe(false);
      });

      it('should reject mismatched type and signature', () => {
        // Valid PDF signature but checking for JPEG
        const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]);
        expect(validateFileSignature(pdfBuffer, 'image/jpeg')).toBe(false);

        // Valid JPEG signature but checking for PDF
        const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
        expect(validateFileSignature(jpegBuffer, 'application/pdf')).toBe(false);
      });
    });
  });

  describe('getFileTypeFromName', () => {
    it('should return pdf for .pdf files', () => {
      expect(getFileTypeFromName('resume.pdf')).toBe('pdf');
      expect(getFileTypeFromName('my-resume.pdf')).toBe('pdf');
      expect(getFileTypeFromName('document.PDF')).toBe('pdf');
    });

    it('should return image for .jpg files', () => {
      expect(getFileTypeFromName('resume.jpg')).toBe('image');
      expect(getFileTypeFromName('photo.JPG')).toBe('image');
    });

    it('should return image for .jpeg files', () => {
      expect(getFileTypeFromName('resume.jpeg')).toBe('image');
      expect(getFileTypeFromName('photo.JPEG')).toBe('image');
    });

    it('should return image for .png files', () => {
      expect(getFileTypeFromName('resume.png')).toBe('image');
      expect(getFileTypeFromName('screenshot.PNG')).toBe('image');
    });

    it('should return image for unknown extensions', () => {
      expect(getFileTypeFromName('file.doc')).toBe('image');
      expect(getFileTypeFromName('file.txt')).toBe('image');
      expect(getFileTypeFromName('file')).toBe('image');
    });

    it('should handle mixed case extensions', () => {
      expect(getFileTypeFromName('resume.Pdf')).toBe('pdf');
      expect(getFileTypeFromName('resume.pDf')).toBe('pdf');
    });

    it('should handle files with multiple dots', () => {
      expect(getFileTypeFromName('my.resume.pdf')).toBe('pdf');
      expect(getFileTypeFromName('my.resume.jpg')).toBe('image');
    });
  });
});
