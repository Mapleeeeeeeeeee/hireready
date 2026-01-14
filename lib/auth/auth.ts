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

const socialProviders = hasGoogleCreds
  ? {
      google: {
        clientId: serverEnv.googleClientId,
        clientSecret: serverEnv.googleClientSecret,
      },
    }
  : {};

// Debug log
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  console.log('[Auth Init] Google OAuth configured:', hasGoogleCreds);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  baseURL: serverEnv.betterAuthUrl,
  secret: serverEnv.betterAuthSecret,

  socialProviders,

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session after 1 day
  },

  trustedOrigins: [serverEnv.betterAuthUrl, 'http://localhost:5555'],
});

export type Session = typeof auth.$Infer.Session;
export type User = Session['user'];
