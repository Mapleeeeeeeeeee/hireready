import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { serverEnv } from '@/lib/config/server';

const pool = new Pool({ connectionString: serverEnv.databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Only configure Google provider if credentials are set
const hasGoogleCreds =
  serverEnv.googleClientId &&
  serverEnv.googleClientSecret &&
  serverEnv.googleClientId.length > 0 &&
  serverEnv.googleClientSecret.length > 0;

// Debug log
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  console.log('[Auth Init] Google OAuth configured:', hasGoogleCreds);
}

// Build auth config conditionally
const authConfig: Parameters<typeof betterAuth>[0] = {
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  baseURL: serverEnv.betterAuthUrl,
  secret: serverEnv.betterAuthSecret,

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session after 1 day
  },

  trustedOrigins: [serverEnv.betterAuthUrl, 'http://localhost:5555'],

  // Note: Session data like user.id, session.token etc. are returned to the client.
  // This is acceptable because:
  // - user.id is the user's own ID, not a security issue
  // - session.token is already stored in the cookie
  // - ipAddress/userAgent are the user's own data
};

// Only add socialProviders if Google credentials are configured
if (hasGoogleCreds) {
  authConfig.socialProviders = {
    google: {
      clientId: serverEnv.googleClientId,
      clientSecret: serverEnv.googleClientSecret,
    },
  };
}

export const auth = betterAuth(authConfig);

export type Session = typeof auth.$Infer.Session;
export type User = Session['user'];
