import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import assert from 'node:assert';

import { env } from './src/env';

const DATABASE_URL =
  env.NODE_ENV === 'test'
    ? 'postgres://postgres:postgres@localhost:4433/hominem-test'
    : env.DATABASE_URL;

assert(DATABASE_URL, 'Missing DATABASE_URL');

console.log('Using DATABASE_URL:', DATABASE_URL);
export default defineConfig({
  schema: './src/schema/tables.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL,
  },
});
