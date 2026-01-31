import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from './env';
import * as schema from './schema/schema';

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

const pool = postgres(DATABASE_URL, {
  max: maxConnections,
  idle_timeout: idleTimeout,
  max_lifetime: maxLifetime,
  connect_timeout: 10,
});

const mainDb = drizzle(pool, { schema });
let testDbOverride: PostgresJsDatabase<typeof schema> | null = null;

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const actualDb = testDbOverride ?? mainDb;
    const value = actualDb[prop as keyof typeof actualDb];
    return typeof value === 'function' ? value.bind(actualDb) : value;
  },
});

export function setTestDb(override: PostgresJsDatabase<typeof schema> | null): void {
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

export { pool as client };

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
