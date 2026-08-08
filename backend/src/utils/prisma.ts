import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __dispatchflowPrisma: PrismaClient | undefined;
}

/**
 * Reuse a single Prisma client in dev so hot reloads do not leak connections.
 * In production this still gives us one shared client per process.
 */
export const prisma =
  global.__dispatchflowPrisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG_LEVEL ? [process.env.PRISMA_LOG_LEVEL as any] : undefined,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__dispatchflowPrisma = prisma;
}
