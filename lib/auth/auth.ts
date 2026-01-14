import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { serverEnv } from '@/lib/config/server';

// Lazy initialization to avoid accessing env vars during build time
let authInstance: ReturnType<typeof betterAuth> | null = null;

function createAuth() {
  const pool = new Pool({ connectionString: serverEnv.databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Only configure Google provider if credentials are set
  const socialProviders =
    serverEnv.googleClientId && serverEnv.googleClientSecret
      ? {
          google: {
            clientId: serverEnv.googleClientId,
            clientSecret: serverEnv.googleClientSecret,
          },
        }
      : {};

  return betterAuth({
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
}

// Use a Proxy to lazily initialize the auth instance
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_, prop) {
    if (!authInstance) {
      authInstance = createAuth();
    }
    return authInstance[prop as keyof typeof authInstance];
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = Session['user'];
