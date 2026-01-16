/**
 * Resume-related type definitions
 */

/**
 * Structured content extracted from resume by Gemini API
 */
export interface ResumeContent {
  /** Candidate's name */
  name?: string;
  /** Contact email */
  email?: string;
  /** Contact phone */
  phone?: string;
  /** Personal summary/objective */
  summary?: string;
  /** List of skills */
  skills?: string[];
  /** Work experience entries */
  experience?: ResumeExperience[];
  /** Education entries */
  education?: ResumeEducation[];
  /** Raw extracted text (backup) */
  rawText?: string;
}

/**
 * Work experience entry
 */
export interface ResumeExperience {
  /** Company name */
  company: string;
  /** Job title */
  title: string;
  /** Duration (e.g., "2020-2023") */
  duration: string;
  /** Job description/achievements */
  description?: string;
}

/**
 * Education entry
 */
export interface ResumeEducation {
  /** School/university name */
  school: string;
  /** Degree/certificate */
  degree: string;
  /** Graduation year */
  year?: string;
}

/**
 * Complete resume data including file metadata
 */
export interface ResumeData {
  /** URL path to the resume file (e.g., "/resumes/userId/resume.pdf") */
  url: string;
  /** Original file name for display */
  fileName: string;
  /** Parsed content from Gemini */
  content: ResumeContent | null;
  /** Background task ID for resume parsing (null if parsing is complete or not queued) */
  taskId: string | null;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Supported resume file types
 */
export const RESUME_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export type ResumeFileType = (typeof RESUME_ALLOWED_TYPES)[number];

/**
 * Resume file constraints
 */
export const RESUME_CONSTRAINTS = {
  /** Maximum file size in bytes (10MB) */
  maxFileSize: 10 * 1024 * 1024,
  /** Allowed MIME types */
  allowedTypes: RESUME_ALLOWED_TYPES,
  /** Allowed file extensions */
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'] as const,
} as const;

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return '.pdf';
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    default:
      return '';
  }
}

/**
 * Check if a MIME type is allowed for resume upload
 */
export function isAllowedResumeType(mimeType: string): mimeType is ResumeFileType {
  return RESUME_ALLOWED_TYPES.includes(mimeType as ResumeFileType);
}

/**
 * Determine file type (pdf or image) from filename
 * Used for displaying appropriate icons and handling file previews
 *
 * @param fileName - File name with extension
 * @returns 'pdf' for PDF files, 'image' for other types
 *
 * @example
 * getFileTypeFromName('resume.pdf') // 'pdf'
 * getFileTypeFromName('resume.jpg') // 'image'
 */
export function getFileTypeFromName(fileName: string): 'pdf' | 'image' {
  return fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
}

// ============================================================
// File Signature Validation (Magic Number Check)
// ============================================================

/**
 * File signatures (magic numbers) for allowed file types
 * Used to verify file content matches declared MIME type
 */
const FILE_SIGNATURES: Record<ResumeFileType, readonly number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47], // .PNG
} as const;

/**
 * Validate that a file's content matches its declared MIME type
 * Checks the file's magic number (first few bytes) against known signatures
 *
 * @param buffer - File content as Buffer
 * @param mimeType - Declared MIME type to validate against
 * @returns true if file signature matches the MIME type, false otherwise
 *
 * @example
 * const isValid = validateFileSignature(fileBuffer, 'application/pdf');
 * if (!isValid) {
 *   throw new Error('File content does not match declared type');
 * }
 */
export function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signature = FILE_SIGNATURES[mimeType as ResumeFileType];

  // If no signature defined for this type, reject
  if (!signature) {
    return false;
  }

  // Check if buffer is too short to contain signature
  if (buffer.length < signature.length) {
    return false;
  }

  // Compare each byte of the signature
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false;
    }
  }

  return true;
}
