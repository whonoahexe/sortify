import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Use process.env directly (not env()) so it never throws during `prisma generate`
// when DATABASE_URL may not be set (e.g. during Vercel's npm install step).
const datasourceUrl =
  process.env.DATABASE_URL ??
  process.env.TURSO_DATABASE_URL ??
  'file:./dev.db';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: datasourceUrl,
  },
});
