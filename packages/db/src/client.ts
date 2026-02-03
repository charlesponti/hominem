import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from './env';
import * as schema from './schema/tables';

const DATABASE_URL =
  env.NODE_ENV === 'test'
    ? 'postgres://postgres:postgres@localhost:4433/hominem-test'
    : env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL not provided. Set DATABASE_URL environment variable or NODE_ENV=test for test database.',
  );
}

const maxConnections = env.DB_MAX_CONNECTIONS ?? 20;
const idleTimeout = env.DB_IDLE_TIMEOUT ?? 30;
const maxLifetime = env.DB_MAX_LIFETIME ?? 3600;

export const pool = postgres(DATABASE_URL, {
  max: maxConnections,
  idle_timeout: idleTimeout,
  max_lifetime: maxLifetime,
  connect_timeout: 10,
});

// Deferred initialization to avoid expensive type checking at module load
let mainDb: any = null;
let testDbOverride: any = null;

function initDb() {
  if (!mainDb) {
    mainDb = drizzle(pool, { schema });
  }
  return testDbOverride ?? mainDb;
}

/**
 * Get the database instance (main or test override)
 *
 * Type is explicitly assigned in index.ts to avoid computing expensive
 * schema type during client.ts import.
 */
export function getDb() {
  return initDb();
}

export function setTestDb(override: any): void {
  testDbOverride = override;
}

export function getDatabaseUrl(): string {
  if (!DATABASE_URL) {
    throw new Error(
      'DATABASE_URL not provided. Set DATABASE_URL environment variable or NODE_ENV=test for test database.',
    );
  }
  return DATABASE_URL;
}

export const takeOne = <T>(values: T[]): T | undefined => {
  return values[0];
};

export const takeUniqueOrThrow = <T>(values: T[]): T => {
  if (values.length === 0) {
    throw new Error('No value found');
  }
  if (values.length > 1) {
    throw new Error('Found multiple values');
  }
  if (!values[0]) {
    throw new Error('Value is undefined');
  }
  return values[0];
};
