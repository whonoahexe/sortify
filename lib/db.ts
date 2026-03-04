import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // In production (Vercel), use the remote Turso database.
  // Locally, LibSQL also supports file: URLs for SQLite.
  const url =
    tursoUrl ?? `file:${path.join(process.cwd(), 'dev.db')}`;

  const adapter = new PrismaLibSql({ url, authToken: tursoToken });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
