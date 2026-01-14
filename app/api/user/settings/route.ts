/**
 * User Settings API Route
 * GET /api/user/settings - Get user settings
 * PUT /api/user/settings - Update user settings
 */

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { ValidationError } from '@/lib/utils/errors';
import { parseJsonBody } from '@/lib/utils/resource-helpers';
import { Prisma } from '@/lib/generated/prisma/client';

type InputJsonValue = Prisma.InputJsonValue;

// ============================================================
// Types
// ============================================================

interface NotificationSettings {
  email?: boolean;
  push?: boolean;
  interviewReminders?: boolean;
  weeklyReport?: boolean;
  [key: string]: boolean | undefined; // Index signature for Prisma JSON compatibility
}

interface UserSettingsResponse {
  id: string;
  preferredLanguage: string;
  theme: string;
  notifications: NotificationSettings | null;
  createdAt: string;
  updatedAt: string;
}

interface UpdateSettingsInput {
  preferredLanguage?: string;
  theme?: string;
  notifications?: NotificationSettings;
}

// ============================================================
// Default Settings
// ============================================================

const DEFAULT_SETTINGS: Omit<UserSettingsResponse, 'id' | 'createdAt' | 'updatedAt'> = {
  preferredLanguage: 'zh-TW',
  theme: 'light',
  notifications: {
    email: true,
    push: true,
    interviewReminders: true,
    weeklyReport: false,
  },
};

// ============================================================
// Validation Constants
// ============================================================

const VALID_LANGUAGES = ['en', 'zh-TW'];
const VALID_THEMES = ['light', 'dark', 'system'];

// ============================================================
// GET Handler - Get User Settings
// ============================================================

async function handleGetSettings(request: Request, userId: string): Promise<UserSettingsResponse> {
  // Fetch user settings
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      id: true,
      preferredLanguage: true,
      theme: true,
      notifications: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Return existing settings or defaults
  if (settings) {
    return {
      id: settings.id,
      preferredLanguage: settings.preferredLanguage,
      theme: settings.theme,
      notifications: settings.notifications as NotificationSettings | null,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  // Return default settings if none exist
  const now = new Date().toISOString();
  return {
    id: '',
    ...DEFAULT_SETTINGS,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================
// PUT Handler - Update User Settings
// ============================================================

async function handleUpdateSettings(
  request: Request,
  userId: string
): Promise<UserSettingsResponse> {
  // Parse request body with error handling
  const body = await parseJsonBody<UpdateSettingsInput>(request);

  // Validate preferredLanguage if provided
  if (body.preferredLanguage !== undefined) {
    if (!VALID_LANGUAGES.includes(body.preferredLanguage)) {
      throw new ValidationError(
        'preferredLanguage',
        `Invalid language. Must be one of: ${VALID_LANGUAGES.join(', ')}`
      );
    }
  }

  // Validate theme if provided
  if (body.theme !== undefined) {
    if (!VALID_THEMES.includes(body.theme)) {
      throw new ValidationError(
        'theme',
        `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}`
      );
    }
  }

  // Validate notifications if provided
  if (body.notifications !== undefined) {
    if (typeof body.notifications !== 'object' || body.notifications === null) {
      throw new ValidationError('notifications', 'Notifications must be an object');
    }
  }

  // Build update data with proper typing for Prisma JSON fields
  const updateData: {
    preferredLanguage?: string;
    theme?: string;
    notifications?: InputJsonValue;
  } = {};

  if (body.preferredLanguage !== undefined) {
    updateData.preferredLanguage = body.preferredLanguage;
  }
  if (body.theme !== undefined) {
    updateData.theme = body.theme;
  }
  if (body.notifications !== undefined) {
    updateData.notifications = body.notifications as InputJsonValue;
  }

  // Upsert user settings (create if not exists, update if exists)
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      preferredLanguage: body.preferredLanguage ?? DEFAULT_SETTINGS.preferredLanguage,
      theme: body.theme ?? DEFAULT_SETTINGS.theme,
      notifications: (body.notifications ?? DEFAULT_SETTINGS.notifications) as InputJsonValue,
    },
    update: updateData,
    select: {
      id: true,
      preferredLanguage: true,
      theme: true,
      notifications: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    id: settings.id,
    preferredLanguage: settings.preferredLanguage,
    theme: settings.theme,
    notifications: settings.notifications as NotificationSettings | null,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export const GET = withAuthHandler(handleGetSettings, {
  module: 'api-user',
  action: 'get-settings',
});

export const PUT = withAuthHandler(handleUpdateSettings, {
  module: 'api-user',
  action: 'update-settings',
});
