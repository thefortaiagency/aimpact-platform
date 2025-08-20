import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({
  path: '.env.local',
});

export default defineConfig({
  schema: ['./lib/db/schema.ts', './lib/db/schema-communications.ts', './lib/db/schema-adhd.ts', './lib/db/schema-projects.ts'],
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // biome-ignore lint: Forbidden non-null assertion.
    url: process.env.DATABASE_URL || process.env.POSTGRES_URL!,
  },
});
