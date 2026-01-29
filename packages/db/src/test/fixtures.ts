import crypto from 'node:crypto'
import { eq, or } from 'drizzle-orm'
import { db } from '@hominem/db'
import { users } from '../schema/users.schema'

export const createTestUser = async (overrides: Partial<typeof users.$inferInsert> = {}) => {
  // If id is provided but supabaseId is not, use id as supabaseId
  // If supabaseId is provided but id is not, use supabaseId as id
  // If neither is provided, generate one and use for both
  let id = overrides.id
  let supabaseId = overrides.supabaseId

  if (id && !supabaseId) {
    supabaseId = id
  } else if (!id && supabaseId) {
    id = supabaseId
  } else if (!(id || supabaseId)) {
    id = crypto.randomUUID()
    supabaseId = id
  }

  // Fallback for types (should be covered by above logic)
  if (!id) {
    id = crypto.randomUUID()
  }
  if (!supabaseId) {
    supabaseId = id
  }

  const user = {
    email: `test-${id}@example.com`,
    name: 'Test User',
    isAdmin: false,
    ...overrides,
    // Ensure these are set to what we calculated if they weren't in overrides
    id,
    supabaseId,
  }

  // Ensure deterministic test data across runs by clearing any conflicting records first.
  await db
    .delete(users)
    .where(or(eq(users.id, id), or(eq(users.supabaseId, supabaseId), eq(users.email, user.email))))
    .catch(() => {})

  await db.insert(users).values(user).onConflictDoNothing()

  return user
}
