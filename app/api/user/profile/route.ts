/**
 * User Profile API Route
 * GET /api/user/profile - Get user profile
 * PUT /api/user/profile - Update user profile
 */

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { InternalServerError, ValidationError } from '@/lib/utils/errors';
import { parseJsonBody } from '@/lib/utils/resource-helpers';

// ============================================================
// Types
// ============================================================

interface UserProfileResponse {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UpdateProfileInput {
  name?: string;
}

// ============================================================
// GET Handler - Get User Profile
// ============================================================

async function handleGetProfile(request: Request, userId: string): Promise<UserProfileResponse> {
  // Fetch user profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    // This should never happen - authenticated session references non-existent user
    throw new InternalServerError('User record not found for authenticated session');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

// ============================================================
// PUT Handler - Update User Profile
// ============================================================

async function handleUpdateProfile(request: Request, userId: string): Promise<UserProfileResponse> {
  // Parse request body with error handling
  const body = await parseJsonBody<UpdateProfileInput>(request);

  // Validate name if provided
  if (body.name !== undefined) {
    if (typeof body.name !== 'string') {
      throw new ValidationError('name', 'Name must be a string');
    }
    if (body.name.length > 100) {
      throw new ValidationError('name', 'Name must be 100 characters or less');
    }
  }

  // Build update data
  const updateData: { name?: string | null } = {};
  if (body.name !== undefined) {
    updateData.name = body.name.trim() || null;
  }

  // Update user profile
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    image: updatedUser.image,
    emailVerified: updatedUser.emailVerified,
    createdAt: updatedUser.createdAt.toISOString(),
    updatedAt: updatedUser.updatedAt.toISOString(),
  };
}

export const GET = withAuthHandler(handleGetProfile, {
  module: 'api-user',
  action: 'get-profile',
});

export const PUT = withAuthHandler(handleUpdateProfile, {
  module: 'api-user',
  action: 'update-profile',
});
