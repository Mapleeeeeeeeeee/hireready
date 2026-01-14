/**
 * Resource ownership verification helpers
 * Provides DRY way to verify resource existence and ownership
 */

import { NotFoundError, ForbiddenError, BadRequestError } from './errors';

/**
 * Verify that a resource exists and belongs to the specified user
 * @throws NotFoundError if resource is null
 * @throws ForbiddenError if resource belongs to a different user
 */
export function verifyOwnership<T extends { userId: string }>(
  resource: T | null,
  userId: string,
  resourceName: string
): T {
  if (!resource) {
    throw new NotFoundError(resourceName);
  }

  if (resource.userId !== userId) {
    throw new ForbiddenError(`Access denied to this ${resourceName.toLowerCase()}`);
  }

  return resource;
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
