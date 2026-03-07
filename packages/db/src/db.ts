import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Database } from './types/database'
import { env } from './env'

const { Pool } = pg

// Create a connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL || 'postgres://localhost/hominem',
})

// Create Kysely instance with proper typing
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
})

// Export pool for graceful shutdown
export { pool }

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
