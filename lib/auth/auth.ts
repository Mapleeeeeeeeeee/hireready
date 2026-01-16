import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { serverEnv } from '@/lib/config/server';

// Lazy initialization to avoid accessing environment variables during build
let _auth: ReturnType<typeof betterAuth> | null = null;

function initAuth() {
  if (_auth) return _auth;

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

    // Redirect to login page on OAuth errors (e.g., user cancels login)
    onAPIError: {
      errorURL: '/login',
    },

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

  _auth = betterAuth(authConfig);
  return _auth;
}

// Create a Proxy that lazily initializes auth on first access
// This avoids accessing environment variables during build time
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_, prop) {
    const authInstance = initAuth();
    const value = authInstance[prop as keyof ReturnType<typeof betterAuth>];
    // If the property is a function, bind it to the auth instance
    if (typeof value === 'function') {
      return value.bind(authInstance);
    }
    return value;
  },
  // Support for 'in' operator checks
  has(_, prop) {
    return prop in initAuth();
  },
  // Support for Object.keys(), etc.
  ownKeys() {
    return Reflect.ownKeys(initAuth());
  },
  // Support for Object.getOwnPropertyDescriptor()
  getOwnPropertyDescriptor(_, prop) {
    return Object.getOwnPropertyDescriptor(initAuth(), prop);
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = Session['user'];
