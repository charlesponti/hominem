import { users } from '@hominem/db/schema/users';
import { eq, or } from '@hominem/db';

import type { SupabaseAuthUser } from './types';

export class UserAuthService {
  /**
   * Find an existing user by id, email or supabaseId, or create one from Supabase user data.
   */
  static async findOrCreateUser(supabaseUser: SupabaseAuthUser) {
    const { db } = await import('@hominem/db');
    const supabaseId = supabaseUser.id;
    const email = supabaseUser.email ?? '';

    // Try to find existing user by supabaseId or email
    const [existing] = await db
      .select()
      .from(users)
      .where(or(eq(users.supabaseId, supabaseId), eq(users.email, email)))
      .limit(1);

    if (existing) {
      if (existing.supabaseId !== supabaseId) {
        const [updated] = await db
          .update(users)
          .set({
            supabaseId,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, existing.id))
          .returning();

        return updated ?? existing;
      }

      return existing;
    }

    const name =
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.full_name ||
      `${supabaseUser.user_metadata?.first_name ?? ''} ${supabaseUser.user_metadata?.last_name ?? ''}`.trim() ||
      undefined;

    const image =
      supabaseUser.user_metadata?.avatar_url ?? supabaseUser.user_metadata?.picture ?? null;

    const now = new Date().toISOString();

    const insertQuery = db.insert(users).values({
      id: crypto.randomUUID(),
      supabaseId,
      email,
      name: name ?? null,
      image,
      isAdmin: supabaseUser.app_metadata?.isAdmin ?? false,
      createdAt: supabaseUser.created_at ?? now,
      updatedAt: supabaseUser.updated_at ?? supabaseUser.created_at ?? now,
    });

    const insertWithConflict = email
      ? insertQuery.onConflictDoUpdate({
          target: users.email,
          set: {
            supabaseId,
            email,
            name: name ?? null,
            image,
            isAdmin: supabaseUser.app_metadata?.isAdmin ?? false,
            updatedAt: supabaseUser.updated_at ?? supabaseUser.created_at ?? now,
          },
        })
      : insertQuery.onConflictDoNothing();

    const [created] = await insertWithConflict.returning();

    // If insert returned nothing (race), fetch again
    if (!created) {
      const [result] = await db
        .select()
        .from(users)
        .where(eq(users.supabaseId, supabaseId))
        .limit(1);
      return result ?? null;
    }

    return created;
  }

  static async findByIdOrEmail(opts: { id?: string; email?: string; supabaseId?: string }) {
    const { db } = await import('@hominem/db');
    const { id, email, supabaseId } = opts;
    if (!id && !email && !supabaseId) {
      return null;
    }

    const conditions: Array<ReturnType<typeof eq>> = [];
    if (id) conditions.push(eq(users.id, id));
    if (email) conditions.push(eq(users.email, email));
    if (supabaseId) conditions.push(eq(users.supabaseId, supabaseId));

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

  static async updateProfileBySupabaseId(
    supabaseId: string,
    updates: Partial<Record<string, unknown>>,
  ) {
    const { db } = await import('@hominem/db');
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(users.supabaseId, supabaseId))
      .returning();

    return updated ?? null;
  }
}
