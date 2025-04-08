import { db } from '@hominem/utils/db'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll } from 'vitest'

beforeAll(async () => {
  // Ensure database connection
  await db.execute(sql`SELECT 1`)
})

afterAll(async () => {
  // Close database connection
  // await db.disconnect()
})
