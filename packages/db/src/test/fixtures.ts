import * as crypto from 'node:crypto';
import { db, sql } from '../index'

export const createTestUser = async (overrides: {
  id?: string
  email?: string
  name?: string
} = {}) => {
  let id = overrides.id
  if (!id) {
    id = crypto.randomUUID()
  }

  const user = {
    email: `test-${id}@example.com`,
    name: 'Test User',
    ...overrides,
    id,
  }

  await db.execute(sql`delete from users where id = ${id}`).catch(() => {})

  await db.execute(sql`
    insert into users (id, email, name)
    values (${user.id}, ${user.email}, ${user.name ?? null})
    on conflict (id) do nothing
  `)

  return user
}
