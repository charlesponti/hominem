import { users } from '@hominem/db/schema/users';
import { eq, or } from '@hominem/db';

export class UserAuthService {
  static async findByIdOrEmail(opts: { id?: string; email?: string }) {
    const { db } = await import('@hominem/db');
    const { id, email } = opts;
    if (!id && !email) {
      return null;
    }

    const conditions: Array<ReturnType<typeof eq>> = [];
    if (id) conditions.push(eq(users.id, id));
    if (email) conditions.push(eq(users.email, email));

    const [result] = await db
      .select()
      .from(users)
      .where(or(...conditions))
      .limit(1);

    return result ?? null;
  }

  static async getUserByEmail(email: string) {
    const { db } = await import('@hominem/db');
    const [result] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result ?? null;
  }

  static async getUserById(id: string) {
    const { db } = await import('@hominem/db');
    const [result] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result ?? null;
  }

  static async deleteUser(id: string) {
    const { db } = await import('@hominem/db');
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }
}
