import { db } from '@hominem/data/db'
import { users } from '@hominem/data/schema'
import crypto from 'node:crypto'

export const createTestUser = async (overrides: Partial<typeof users.$inferInsert> = {}) => {
  const id = overrides.id ?? crypto.randomUUID()
  const user = {
    id,
    supabaseId: `supabase_${id}`,
    email: `test-${id}@example.com`,
    name: 'Test User',
    isAdmin: false,
    ...overrides,
  }

  await db.insert(users).values(user).onConflictDoNothing()

  return user
}

