/**
 * Authentication helper for API routes
 * Provides a DRY way to validate authentication and extract user ID
 */

import { auth } from '@/lib/auth/auth';
import { UnauthorizedError } from '@/lib/utils/errors';

/**
 * Validate authentication and return the user ID
 * @throws UnauthorizedError if user is not authenticated
 */
export async function requireAuth(request: Request): Promise<string> {
  const session = await auth.api.getSession({
    headers: new Headers(request.headers),
  });

  if (!session?.user?.id) {
    throw new UnauthorizedError('Authentication required');
  }

  return session.user.id;
}
