import type { Users } from '@hominem/db'
import { db } from '@hominem/db'

type UserRow = {
  id: string
  email: string
  avatar_url: string | null
  created_at: string | null
  email_verified: boolean
  image: string | null
  is_admin: boolean
  name: string | null
  updated_at: string | null
}

export class UserAuthService {
  static async findByIdOrEmail(opts: { id?: string; email?: string }): Promise<UserRow | null> {
    const { id, email } = opts
    if (!id && !email) {
      return null
    }

    let query = db.selectFrom('users').selectAll()

    if (id && email) {
      query = query.where((eb) => eb.or([eb('id', '=', id), eb('email', '=', email)]))
    } else if (id) {
      query = query.where('id', '=', id)
    } else {
      query = query.where('email', '=', email!)
    }

    const result = await query.limit(1).executeTakeFirst()
    return (result as unknown as UserRow) ?? null
  }

  static async getUserByEmail(email: string): Promise<UserRow | null> {
    const result = await db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .limit(1)
      .executeTakeFirst()

    return (result as unknown as UserRow) ?? null
  }

  static async getUserById(id: string): Promise<UserRow | null> {
    const result = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .limit(1)
      .executeTakeFirst()

    return (result as unknown as UserRow) ?? null
  }

  static async deleteUser(id: string): Promise<boolean> {
    const result = await db
      .deleteFrom('users')
      .where('id', '=', id)
      .executeTakeFirst()

    return (result.numDeletedRows ?? 0n) > 0n
  }
}
