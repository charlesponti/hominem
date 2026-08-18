import { CamelCasePlugin, Kysely, PostgresDialect, sql as kyselySql } from 'kysely';
import pg from 'pg';

import { env } from './env';
import type { DB } from './types/database';

export type Database = DB;

const { Pool, types } = pg;

// Re-export Kysely's sql template tag for raw SQL queries
// Usage: await sql`SELECT * FROM users`.execute(db)
export const sql = kyselySql;

// Configure pg to return dates as strings instead of Date objects
// This ensures consistent string types across the codebase
types.setTypeParser(types.builtins.TIMESTAMP, (val) => val);
types.setTypeParser(types.builtins.TIMESTAMPTZ, (val) => val);
types.setTypeParser(types.builtins.DATE, (val) => val);

// Configure pg to return numeric as number for consistent types
// Safe for finance amounts — precision loss only affects very large values
types.setTypeParser(types.builtins.NUMERIC, (val) => parseFloat(val));

// Create a connection pool
const connectionString = env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to initialize the database pool');
}

export const pool = new Pool({
  connectionString,
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
  plugins: [new CamelCasePlugin()],
});

// better-auth manages its own tables (account, session, user, verification,
// jwks, deviceCode) and writes genuinely camelCase columns to Postgres directly, unlike
// our app.* tables which are snake_case at rest. Those tables must bypass
// CamelCasePlugin or it will mistranslate already-camelCase columns into snake_case SQL
// that doesn't exist.
export const authDb = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
});
