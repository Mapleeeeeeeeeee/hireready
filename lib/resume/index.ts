/**
 * Resume module - exports all resume-related functionality
 */

// Types
export type {
  ResumeContent,
  ResumeExperience,
  ResumeEducation,
  ResumeData,
  ResumeFileType,
} from './types';

export {
  RESUME_ALLOWED_TYPES,
  RESUME_CONSTRAINTS,
  getExtensionFromMimeType,
  isAllowedResumeType,
  validateFileSignature,
  getFileTypeFromName,
} from './types';

// Templates
export type { ResumeTemplate } from './templates';
export { RESUME_TEMPLATES, getTemplateById } from './templates';

// Parser
export { parseResume } from './gemini-parser';

// Service
export {
  saveResume,
  getResume,
  deleteResume,
  saveResumeFile,
  deleteResumeFile,
  reparseResume,
  getResumeFilePath,
} from './resume-service';
