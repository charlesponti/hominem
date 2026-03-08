import { Kysely, PostgresDialect, sql as kyselySql, type Sql } from 'kysely'
import pg from 'pg'
import type { Database } from './types/database'
import { env } from './env'

const { Pool, types } = pg

// Configure pg to return dates as strings instead of Date objects
// This ensures consistent string types across the codebase
types.setTypeParser(types.builtins.TIMESTAMP, (val) => val)
types.setTypeParser(types.builtins.TIMESTAMPTZ, (val) => val)
types.setTypeParser(types.builtins.DATE, (val) => val)

// Create a connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL || 'postgres://localhost/hominem',
})

// Create Kysely instance with proper typing
const kyselyDb = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
})

// Create a wrapper that adds execute method for raw SQL queries (Drizzle compatibility)
export const db = Object.assign(kyselyDb, {
  execute: async (query: ReturnType<typeof kyselySql>): Promise<{ rowCount: number }> => {
    const compiled = query.compile(kyselyDb)
    const result = await pool.query(compiled.sql, [...compiled.parameters])
    return { rowCount: result.rowCount || 0 }
  },
})

// Export pool for graceful shutdown
export { pool }

// Export sql for raw queries (used in tests)
export { kyselySql as sql }

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}
