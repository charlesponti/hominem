import { Kysely, PostgresDialect, sql as kyselySql } from 'kysely'
import pg from 'pg'
import type { Database } from './types/database'
import { env } from './env'

const { Pool, types } = pg

// Re-export Kysely's sql template tag for raw SQL queries
// Usage: await db.execute(sql`SELECT * FROM users`)
export const sql = kyselySql

// Configure pg to return dates as strings instead of Date objects
// This ensures consistent string types across the codebase
types.setTypeParser(types.builtins.TIMESTAMP, (val) => val)
types.setTypeParser(types.builtins.TIMESTAMPTZ, (val) => val)
types.setTypeParser(types.builtins.DATE, (val) => val)

// Create a connection pool
export const pool = new Pool({
  connectionString: env.DATABASE_URL || 'postgres://localhost/hominem',
})

// Create Kysely instance with proper typing
class KyselyDb extends Kysely<Database> {
  async execute(query: Parameters<typeof this.executeQuery>[0]) {
    return this.executeQuery(query)
  }
}

export const db = new KyselyDb({
  dialect: new PostgresDialect({
    pool,
  }),
})

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
