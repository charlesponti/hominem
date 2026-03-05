import { eq } from 'drizzle-orm';

import { db } from '../index';
import * as crypto from 'node:crypto';

import { users } from '../schema/tasks';

export const createTestUser = async (overrides: Partial<typeof users.$inferInsert> = {}) => {
  // Generate an id if not provided
  let id = overrides.id;
  if (!id) {
    id = crypto.randomUUID();
  }

  const user = {
    email: `test-${id}@example.com`,
    name: 'Test User',
    ...overrides,
    // Ensure id is set to what we calculated if it wasn't in overrides
    id,
  };

  // Ensure deterministic test data across runs by clearing any conflicting records first.
  await db
    .delete(users)
    .where(eq(users.id, id))
    .catch(() => {});

  await db.insert(users).values(user).onConflictDoNothing();

  return user;
};
