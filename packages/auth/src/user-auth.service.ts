import { db, sql } from '@hominem/db'

interface UserRow {
  id: string
  email: string
  name: string | null
  image: string | null
  avatar_url: string | null
  is_admin: boolean | null
  created_at: string | null
  updated_at: string | null
}

function resultRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[]
  }
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows
    if (Array.isArray(rows)) {
      return rows as T[]
    }
  }
  return []
}

export class UserAuthService {
  static async findByIdOrEmail(opts: { id?: string; email?: string }) {
    const { id, email } = opts
    if (!id && !email) {
      return null
    }

    if (id && email) {
      const result = await db.execute(sql`
        select id, email, name, image, avatar_url, is_admin, created_at, updated_at
        from users
        where id = ${id}
           or email = ${email}
        limit 1
      `)
      return resultRows<UserRow>(result)[0] ?? null
    }

    if (id) {
      const result = await db.execute(sql`
        select id, email, name, image, avatar_url, is_admin, created_at, updated_at
        from users
        where id = ${id}
        limit 1
      `)
      return resultRows<UserRow>(result)[0] ?? null
    }

    const result = await db.execute(sql`
      select id, email, name, image, avatar_url, is_admin, created_at, updated_at
      from users
      where email = ${email!}
      limit 1
    `)
    return resultRows<UserRow>(result)[0] ?? null
  }

  static async getUserByEmail(email: string) {
    const result = await db.execute(sql`
      select id, email, name, image, avatar_url, is_admin, created_at, updated_at
      from users
      where email = ${email}
      limit 1
    `)
    return resultRows<UserRow>(result)[0] ?? null
  }

  static async getUserById(id: string) {
    const result = await db.execute(sql`
      select id, email, name, image, avatar_url, is_admin, created_at, updated_at
      from users
      where id = ${id}
      limit 1
    `)
    return resultRows<UserRow>(result)[0] ?? null
  }

  static async deleteUser(id: string) {
    const result = await db.execute(sql`
      delete from users
      where id = ${id}
      returning id
    `)
    return resultRows<{ id: string }>(result).length > 0
  }
}
