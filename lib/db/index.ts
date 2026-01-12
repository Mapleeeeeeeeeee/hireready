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

// In development, reuse the client to avoid connection pool exhaustion
export const prisma = globalThis.prisma ?? createPrismaClient();

if (serverEnv.nodeEnv !== 'production') {
  globalThis.prisma = prisma;
}

export type { PrismaClient };
