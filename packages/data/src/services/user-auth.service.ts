import type { User as SupabaseUser } from "@supabase/supabase-js";
import { eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  bookmark,
  events,
  eventsTags,
  type UserSelect,
  users,
} from "../db/schema";

type AuthUserMetadata = {
  avatar_url?: string;
  full_name?: string;
  display_name?: string;
  name?: string;
  picture?: string;
  image?: string;
  isAdmin?: boolean;
  is_admin?: boolean;
};

type AuthAppMetadata = {
  isAdmin?: boolean;
  is_admin?: boolean;
};

type SupabaseAuthUser = SupabaseUser & {
  user_metadata: AuthUserMetadata;
  app_metadata: AuthAppMetadata;
};

export class UserAuthService {
  static async getUserById(id: string): Promise<UserSelect | undefined> {
    return db.query.users.findFirst({ where: eq(users.id, id) }) ?? undefined;
  }

  static async getUserByEmail(email: string): Promise<UserSelect | undefined> {
    return (
      db.query.users.findFirst({ where: eq(users.email, email) }) ?? undefined
    );
  }

  static async findOrCreateUser(
    supabaseUser: SupabaseAuthUser
  ): Promise<UserSelect | null> {
    try {
      const existingUser = await UserAuthService.findByIdOrEmail({
        id: supabaseUser.id,
        email: supabaseUser.email,
      });
      if (existingUser) return existingUser;

      return await UserAuthService.createUser(supabaseUser);
    } catch (error) {
      console.error("Error in findOrCreateUser:", {
        error: error instanceof Error ? error.message : String(error),
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Re-throw the original error to preserve error details
      throw error;
    }
  }

  static async findByIdOrEmail({
    id,
    email,
  }: {
    id?: string;
    email?: string;
  }): Promise<UserSelect | null> {
    if (!id && !email) {
      return null;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          id ? eq(users.id, id) : undefined,
          email ? eq(users.email, email) : undefined
        )
      )
      .limit(1);
    return user ?? null;
  }

  static async findBySupabaseId(
    supabaseId: string
  ): Promise<UserSelect | null> {
    try {
      return await UserAuthService.findByIdOrEmail({ id: supabaseId });
    } catch (error) {
      // Extract full error details including nested causes
      const errorDetails: Record<string, unknown> = {
        error: error instanceof Error ? error.message : String(error),
        supabaseId,
        stack: error instanceof Error ? error.stack : undefined,
      };

      // Check for nested error properties (common in Drizzle/Postgres errors)
      if (error instanceof Error) {
        if ("cause" in error && error.cause) {
          errorDetails.cause =
            error.cause instanceof Error
              ? error.cause.message
              : String(error.cause);
          if (error.cause instanceof Error && "code" in error.cause) {
            errorDetails.causeCode = error.cause.code;
          }
        }
        if ("code" in error) {
          errorDetails.code = error.code;
        }
        if ("name" in error) {
          errorDetails.name = error.name;
        }
      }

      console.error("Error finding user by supabaseId:", errorDetails);
      // Re-throw to let caller handle the error
      throw error;
    }
  }

  private static async createUser(
    supabaseUser: SupabaseAuthUser
  ): Promise<UserSelect | null> {
    if (!supabaseUser.email) {
      throw new Error("Cannot create user without email");
    }

    const name = UserAuthService.extractName(supabaseUser);
    const image = UserAuthService.extractImage(supabaseUser);
    const isAdmin = UserAuthService.extractIsAdmin(supabaseUser);

    const [newUser] = await db
      .insert(users)
      .values({
        id: supabaseUser.id,
        email: supabaseUser.email,
        name,
        image,
        supabaseId: supabaseUser.id,
        isAdmin,
        photoUrl: image,
      })
      .returning();

    return newUser ?? null;
  }

  private static extractName(supabaseUser: SupabaseUser): string | null {
    return (
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.display_name ||
      null
    );
  }

  /**
   * Extract image from Supabase user metadata
   */
  private static extractImage(supabaseUser: SupabaseUser): string | null {
    return (
      supabaseUser.user_metadata?.avatar_url ||
      supabaseUser.user_metadata?.picture ||
      supabaseUser.user_metadata?.image ||
      null
    );
  }

  /**
   * Extract isAdmin from Supabase user metadata
   */
  private static extractIsAdmin(supabaseUser: SupabaseUser): boolean {
    return Boolean(
      supabaseUser.user_metadata?.isAdmin ||
        supabaseUser.user_metadata?.is_admin ||
        supabaseUser.app_metadata?.isAdmin ||
        supabaseUser.app_metadata?.is_admin
    );
  }

  static async updateProfileBySupabaseId(
    supabaseId: string,
    updates: { name?: string; image?: string }
  ): Promise<UserSelect | null> {
    const [updatedUser] = await db
      .update(users)
      .set({
        name: updates.name || null,
        image: updates.image || null,
        photoUrl: updates.image || null,
      })
      .where(eq(users.supabaseId, supabaseId))
      .returning();

    return updatedUser ?? null;
  }

  static async deleteUser(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(bookmark).where(eq(bookmark.userId, userId));
      await tx
        .delete(eventsTags)
        .where(
          sql`${eventsTags.eventId} IN (SELECT ${events.id} FROM ${events} WHERE ${events.userId} = ${userId})`
        );
      await tx.delete(events).where(eq(events.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
  }
}
