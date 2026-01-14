/**
 * User Settings API Route
 * GET /api/user/settings - Get user settings
 * PUT /api/user/settings - Update user settings
 */

import { prisma } from '@/lib/db';
import { withAuthHandler } from '@/lib/utils/api-response';
import { parseJsonBody } from '@/lib/utils/resource-helpers';
import { validators } from '@/lib/utils/validation';
import { Prisma } from '@/lib/generated/prisma/client';
import {
  SUPPORTED_LANGUAGES,
  UI_THEMES,
  DEFAULT_USER_SETTINGS,
  type SupportedLanguage,
  type UITheme,
} from '@/lib/constants/enums';
import type { NotificationSettings } from '@/lib/types/user';

type InputJsonValue = Prisma.InputJsonValue;

// ============================================================
// Types
// ============================================================

interface UserSettingsResponse {
  id: string;
  preferredLanguage: string;
  theme: string;
  notifications: NotificationSettings | null;
  createdAt: string;
  updatedAt: string;
}

interface UpdateSettingsInput {
  preferredLanguage?: SupportedLanguage;
  theme?: UITheme;
  notifications?: NotificationSettings;
}

// ============================================================
// Validation Helpers
// ============================================================

function validateSettings(body: UpdateSettingsInput): void {
  // Validate preferredLanguage if provided
  if (body.preferredLanguage !== undefined) {
    const result = validators.oneOf(
      'preferredLanguage',
      SUPPORTED_LANGUAGES
    )(body.preferredLanguage);
    if (!result.ok) {
      throw result.error;
    }
  }

  // Validate theme if provided
  if (body.theme !== undefined) {
    const result = validators.oneOf('theme', UI_THEMES)(body.theme);
    if (!result.ok) {
      throw result.error;
    }
  }

  // Validate notifications if provided
  if (body.notifications !== undefined) {
    const result = validators.required('notifications', (value) => {
      if (typeof value !== 'object' || value === null) {
        return { ok: false, error: new Error('Notifications must be an object') } as never;
      }
      return { ok: true, value: value as NotificationSettings };
    })(body.notifications);
    if (!result.ok) {
      throw result.error;
    }
  }
}

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
    preferredLanguage: DEFAULT_USER_SETTINGS.preferredLanguage,
    theme: DEFAULT_USER_SETTINGS.theme,
    notifications: { ...DEFAULT_USER_SETTINGS.notifications },
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

  // Validate using centralized validators
  validateSettings(body);

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
      preferredLanguage: body.preferredLanguage ?? DEFAULT_USER_SETTINGS.preferredLanguage,
      theme: body.theme ?? DEFAULT_USER_SETTINGS.theme,
      notifications: (body.notifications ?? DEFAULT_USER_SETTINGS.notifications) as InputJsonValue,
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
