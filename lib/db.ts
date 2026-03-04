import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

// Construct the URL dynamically for the local fallback
const dbUrl = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || dbUrl;
const authToken = process.env.TURSO_AUTH_TOKEN;

const adapter = new PrismaLibSql({
  url,
  authToken,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
