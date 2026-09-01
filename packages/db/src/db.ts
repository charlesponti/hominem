import { CamelCasePlugin, Kysely, PostgresDialect, sql as kyselySql } from 'kysely';
import pg from 'pg';

import { env } from './env';
import type { DB } from './types/database';

export type Database = DB;

const { Pool, types } = pg;

// Re-export Kysely's sql tag so callers can do raw SQL without importing kysely directly
export const sql = kyselySql;

// Keep dates as raw strings instead of letting pg parse them into JS Date
// objects, so the whole codebase deals with one consistent type
types.setTypeParser(types.builtins.TIMESTAMP, (val) => val);
types.setTypeParser(types.builtins.TIMESTAMPTZ, (val) => val);
types.setTypeParser(types.builtins.DATE, (val) => val);

// Parse numeric as a JS number instead of a string. Fine for finance
// amounts — you'd only lose precision on numbers way bigger than any real balance
types.setTypeParser(types.builtins.NUMERIC, (val) => parseFloat(val));

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

// better-auth's own tables (account, session, user, verification, jwks,
// deviceCode) actually store camelCase columns, unlike our snake_case app.*
// tables. Skip CamelCasePlugin for this client or it'll try to rewrite
// already-camelCase columns into snake_case SQL that doesn't exist.
export const authDb = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
});
