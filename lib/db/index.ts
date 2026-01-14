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

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: serverEnv.databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Lazy initialization - only create client when accessed
function getPrismaClient(): PrismaClient {
  if (!globalThis.prisma) {
    globalThis.prisma = createPrismaClient();
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
