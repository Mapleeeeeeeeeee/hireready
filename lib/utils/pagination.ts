/**
 * Pagination utilities
 * Provides reusable pagination logic for API routes
 */

// ============================================================
// Types
// ============================================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationParamsWithFilters<T = Record<string, unknown>> extends PaginationParams {
  filters: T;
}

export interface PaginationConfig {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
  minLimit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================================
// Default Configuration
// ============================================================

const DEFAULT_CONFIG: Required<PaginationConfig> = {
  defaultPage: 1,
  defaultLimit: 10,
  maxLimit: 100,
  minLimit: 1,
};

// ============================================================
// Core Functions
// ============================================================

/**
 * Parse a numeric query parameter with bounds
 */
function parseIntParam(
  value: string | null,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (value === null) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Parse pagination parameters from URL search params
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  config: PaginationConfig = {}
): PaginationParams {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const page = parseIntParam(
    searchParams.get('page'),
    mergedConfig.defaultPage,
    1,
    Number.MAX_SAFE_INTEGER
  );

  const limit = parseIntParam(
    searchParams.get('limit'),
    mergedConfig.defaultLimit,
    mergedConfig.minLimit,
    mergedConfig.maxLimit
  );

  return { page, limit };
}

/**
 * Parse pagination parameters from URL string
 */
export function parsePaginationFromUrl(
  url: string,
  config: PaginationConfig = {}
): PaginationParams {
  const urlObj = new URL(url);
  return parsePaginationParams(urlObj.searchParams, config);
}

/**
 * Parse pagination parameters with additional filter fields
 */
export function parsePaginationWithFilters<T>(
  url: string,
  filterParser: (searchParams: URLSearchParams) => T,
  config: PaginationConfig = {}
): PaginationParamsWithFilters<T> {
  const urlObj = new URL(url);
  const pagination = parsePaginationParams(urlObj.searchParams, config);
  const filters = filterParser(urlObj.searchParams);

  return {
    ...pagination,
    filters,
  };
}

/**
 * Calculate pagination offset for database queries
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore,
  };
}

/**
 * Create Prisma-compatible pagination options
 */
export function toPrismaOptions(params: PaginationParams): { skip: number; take: number } {
  return {
    skip: calculateOffset(params.page, params.limit),
    take: params.limit,
  };
}
