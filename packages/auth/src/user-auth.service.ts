import { db, type Database, type Selectable } from '@hominem/db'

type UserRow = Selectable<Database['auth.users']>

export class UserAuthService {
  static async findByIdOrEmail(opts: { id?: string; email?: string }): Promise<UserRow | null> {
    const { id, email } = opts
    if (!id && !email) {
      return null
    }

    let query = db.selectFrom('auth.users').selectAll()

    if (id && email) {
      query = query.where((eb) => eb.or([eb('id', '=', id), eb('email', '=', email)]))
    } else if (id) {
      query = query.where('id', '=', id)
    } else if (email) {
      query = query.where('email', '=', email)
    }

    const result = await query.limit(1).executeTakeFirst()
    return result ?? null
  }

  static async getUserByEmail(email: string): Promise<UserRow | null> {
    const result = await db
      .selectFrom('auth.users')
      .selectAll()
      .where('email', '=', email)
      .limit(1)
      .executeTakeFirst()

    return result ?? null
  }

  static async getUserById(id: string): Promise<UserRow | null> {
    const result = await db
      .selectFrom('auth.users')
      .selectAll()
      .where('id', '=', id)
      .limit(1)
      .executeTakeFirst()

    return result ?? null
  }

  static async deleteUser(id: string): Promise<boolean> {
    const result = await db
      .deleteFrom('auth.users')
      .where('id', '=', id)
      .executeTakeFirst()

    return (result.numDeletedRows ?? 0n) > 0n
  }
}
