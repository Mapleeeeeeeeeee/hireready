/**
 * JD (Job Description) Module
 * Provides functionality for parsing and managing job descriptions
 * from various job boards (104, 1111) and manual input
 */

// Types
export type { JobDescription, JDSource, ManualJobInput } from './types';
export { hasJobDescriptionContent } from './types';

// Provider types
export type { JDProvider, ProviderConfig } from './providers';

// Service functions
export {
  parseJobUrl,
  parseJobUrlWithRetry,
  createManualJob,
  createFromText,
  isUrlSupported,
  getSupportedDomains,
  JDService,
} from './jd-service';

// Validators
export {
  isValidUrl,
  isValidJobUrl,
  parseJobUrl as parseUrl,
  getSourceFromUrl,
  normalizeJobUrl,
  extractJobId,
  buildJobUrl,
  isDomainSupported,
  type ParsedJobUrl,
} from './validators';

// Provider classes (for advanced usage)
export {
  ProviderFactory,
  getProviderFactory,
  getProviderForUrl,
  Provider104,
  Provider1111,
  ManualProvider,
  BaseJDProvider,
  manualProvider,
} from './providers';
