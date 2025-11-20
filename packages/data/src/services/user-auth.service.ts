import { randomUUID } from 'node:crypto'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'

export interface UserAuthData {
  id: string
  email: string
  name?: string
  image?: string
  supabaseId: string
  isAdmin?: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Standardized service for managing the relationship between Supabase auth and local users table
 */
export class UserAuthService {
  /**
   * Find or create a user from Supabase auth data
   * This is the single source of truth for user creation/lookup
   */
  static async findOrCreateUser(supabaseUser: SupabaseUser): Promise<UserAuthData> {
    try {
      // First, try to find existing user by supabaseId
      const existingUser = await UserAuthService.findBySupabaseId(supabaseUser.id)
      if (existingUser) {
        // Update user data if it has changed
        await UserAuthService.updateUserFromSupabase(existingUser.id, supabaseUser)
        return existingUser
      }

      // If not found by supabaseId, try by email (for migration scenarios)
      if (supabaseUser.email) {
        const userByEmail = await UserAuthService.findByEmail(supabaseUser.email)
        if (userByEmail) {
          // Update existing user with supabaseId
          const updatedUser = await UserAuthService.updateUserSupabaseId(
            userByEmail.id,
            supabaseUser.id
          )
          return updatedUser
        }
      }

      // Create new user
      return await UserAuthService.createUser(supabaseUser)
    } catch (error) {
      console.error('Error in findOrCreateUser:', {
        error: error instanceof Error ? error.message : String(error),
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        stack: error instanceof Error ? error.stack : undefined,
      })
      // Re-throw the original error to preserve error details
      throw error
    }
  }

  /**
   * Find user by Supabase ID
   */
  static async findBySupabaseId(supabaseId: string): Promise<UserAuthData | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId)).limit(1)

      return user ? UserAuthService.mapToUserAuthData(user) : null
    } catch (error) {
      // Extract full error details including nested causes
      const errorDetails: Record<string, unknown> = {
        error: error instanceof Error ? error.message : String(error),
        supabaseId,
        stack: error instanceof Error ? error.stack : undefined,
      }

      // Check for nested error properties (common in Drizzle/Postgres errors)
      if (error instanceof Error) {
        if ('cause' in error && error.cause) {
          errorDetails.cause =
            error.cause instanceof Error ? error.cause.message : String(error.cause)
          if (error.cause instanceof Error && 'code' in error.cause) {
            errorDetails.causeCode = error.cause.code
          }
        }
        if ('code' in error) {
          errorDetails.code = error.code
        }
        if ('name' in error) {
          errorDetails.name = error.name
        }
      }

      console.error('Error finding user by supabaseId:', errorDetails)
      // Re-throw to let caller handle the error
      throw error
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<UserAuthData | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

      return user ? UserAuthService.mapToUserAuthData(user) : null
    } catch (error) {
      console.error('Error finding user by email:', error)
      return null
    }
  }

  /**
   * Create a new user from Supabase data
   */
  private static async createUser(supabaseUser: SupabaseUser): Promise<UserAuthData> {
    if (!supabaseUser.email) {
      throw new Error('Cannot create user without email')
    }

    const name = UserAuthService.extractName(supabaseUser)
    const image = UserAuthService.extractImage(supabaseUser)
    const isAdmin = UserAuthService.extractIsAdmin(supabaseUser)

    const [newUser] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: supabaseUser.email,
        name,
        image,
        supabaseId: supabaseUser.id,
        isAdmin,
        photoUrl: image, // Keep photoUrl in sync with image
      })
      .returning()

    if (!newUser) {
      throw new Error('User not created')
    }

    return UserAuthService.mapToUserAuthData(newUser)
  }

  /**
   * Update user data from Supabase (for existing users)
   */
  private static async updateUserFromSupabase(
    userId: string,
    supabaseUser: SupabaseUser
  ): Promise<void> {
    const name = UserAuthService.extractName(supabaseUser)
    const image = UserAuthService.extractImage(supabaseUser)
    const isAdmin = UserAuthService.extractIsAdmin(supabaseUser)

    await db
      .update(users)
      .set({
        email: supabaseUser.email || '',
        name,
        image,
        isAdmin,
        photoUrl: image, // Keep photoUrl in sync with image
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
  }

  /**
   * Update user's supabaseId (for migration scenarios)
   */
  private static async updateUserSupabaseId(
    userId: string,
    supabaseId: string
  ): Promise<UserAuthData> {
    const [updatedUser] = await db
      .update(users)
      .set({ supabaseId })
      .where(eq(users.id, userId))
      .returning()

    if (!updatedUser) {
      throw new Error('User not found')
    }

    return UserAuthService.mapToUserAuthData(updatedUser)
  }

  /**
   * Extract name from Supabase user metadata
   */
  private static extractName(supabaseUser: SupabaseUser): string | null {
    return (
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.display_name ||
      null
    )
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
    )
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
    )
  }

  /**
   * Map database user to UserAuthData
   */
  private static mapToUserAuthData(user: typeof users.$inferSelect): UserAuthData {
    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      image: user.image || undefined,
      supabaseId: user.supabaseId,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
