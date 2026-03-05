import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import assert from 'node:assert';

import { env } from './src/env';

const DATABASE_URL =
  env.NODE_ENV === 'test'
    ? 'postgres://postgres:postgres@localhost:4433/hominem-test?options=-c%20client_min_messages=warning'
    : env.DATABASE_URL + '?options=-c%20client_min_messages=warning';

assert(DATABASE_URL, 'Missing DATABASE_URL');

export default defineConfig({
  schema: ['./src/migrations/schema.ts', './src/migrations/relations.ts'],
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL,
  },
});
