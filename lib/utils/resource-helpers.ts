/**
 * Resource ownership verification helpers
 * Provides DRY way to verify resource existence and ownership
 */

import { NotFoundError, ForbiddenError, BadRequestError } from './errors';

// ============================================================
// Path Parameter Extraction
// ============================================================

/**
 * Extract a path parameter from a URL at the specified segment index
 * @param url The full URL string
 * @param segmentIndex The index of the path segment to extract (0-based, after filtering empty segments)
 * @param paramName The name of the parameter for error messages
 * @throws BadRequestError if the parameter is missing
 */
export function extractPathParam(url: string, segmentIndex: number, paramName: string): string {
  const urlObj = new URL(url);
  const pathSegments = urlObj.pathname.split('/').filter(Boolean);
  const value = pathSegments[segmentIndex];

  if (!value) {
    throw new BadRequestError(`${paramName} is required`);
  }

  return value;
}

/**
 * Extract a resource ID from a standard API route pattern
 * URL format: /api/{resource}/[id] -> segmentIndex = 2
 * @param url The full URL string
 * @param resourceName The name of the resource for error messages (e.g., 'Interview', 'User')
 */
export function extractResourceId(url: string, resourceName: string): string {
  return extractPathParam(url, 2, `${resourceName} ID`);
}

/**
 * Verify that a resource exists and belongs to the specified user
 * @throws NotFoundError if resource is null
 * @throws ForbiddenError if resource belongs to a different user
 */
export function verifyOwnership<T extends { userId: string | null }>(
  resource: T | null,
  userId: string,
  resourceName: string
): T & { userId: string } {
  if (!resource) {
    throw new NotFoundError(resourceName);
  }

  if (resource.userId !== userId) {
    throw new ForbiddenError(`Access denied to this ${resourceName.toLowerCase()}`);
  }

  return resource as T & { userId: string };
}

/**
 * Safely parse JSON from request body with proper error handling
 * @throws BadRequestError if JSON is invalid
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new BadRequestError('Invalid JSON in request body');
  }
}
