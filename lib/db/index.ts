/**
 * Database client singleton
 * Uses Prisma with PostgreSQL adapter
 */

import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { serverEnv } from '@/lib/config/server';

// Global declaration for development hot-reloading
declare global {
  var prisma: PrismaClient | undefined;
}

// Lazy initialization - only create client when accessed
function getPrismaClient(): PrismaClient {
  if (!globalThis.prisma) {
    // Defer Pool and adapter creation until actually needed
    const pool = new Pool({ connectionString: serverEnv.databaseUrl });
    const adapter = new PrismaPg(pool);
    globalThis.prisma = new PrismaClient({ adapter });
  }
  return globalThis.prisma;
}

// Export as a getter to ensure lazy initialization
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return getPrismaClient()[prop as keyof PrismaClient];
  },
});

export type { PrismaClient };
