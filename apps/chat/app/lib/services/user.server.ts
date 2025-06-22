import { users, type User, type UserInsert } from '@hominem/utils/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '../db.server'

export interface CreateUserParams {
  email: string
  name?: string
  image?: string
  supabaseId: string
}

export class UserDatabaseService {
  /**
   * Find user by supabase ID
   */
  static async findBySupabaseId(supabaseId: string): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId)).limit(1)

      return user || null
    } catch (error) {
      console.error('Failed to find user by supabase ID:', error)
      return null
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

      return user || null
    } catch (error) {
      console.error('Failed to find user by email:', error)
      return null
    }
  }

  /**
   * Create a new user
   */
  static async createUser(params: CreateUserParams): Promise<User> {
    try {
      const userInsert: UserInsert = {
        id: randomUUID(),
        email: params.email,
        name: params.name || null,
        image: params.image || null,
        supabaseId: params.supabaseId,
        photoUrl: params.image || null,
      }

      const [newUser] = await db.insert(users).values(userInsert).returning()

      return newUser
    } catch (error) {
      console.error('Failed to create user:', error)
      throw new Error('Failed to create user')
    }
  }

  /**
   * Find or create user by supabase session
   */
  static async findOrCreateUser(supabaseUser: {
    id: string
    email?: string
    user_metadata?: {
      name?: string
      full_name?: string
      avatar_url?: string
    }
  }): Promise<User> {
    // First try to find by supabase ID
    let user = await UserDatabaseService.findBySupabaseId(supabaseUser.id)

    if (user) {
      return user
    }

    // If not found by supabase ID and email exists, try by email
    if (supabaseUser.email) {
      user = await UserDatabaseService.findByEmail(supabaseUser.email)

      if (user) {
        // Update existing user with supabase ID
        const [updatedUser] = await db
          .update(users)
          .set({ supabaseId: supabaseUser.id })
          .where(eq(users.id, user.id))
          .returning()

        return updatedUser
      }
    }

    // User doesn't exist, create new one
    if (!supabaseUser.email) {
      throw new Error('Cannot create user without email')
    }

    const name =
      supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || undefined

    const image = supabaseUser.user_metadata?.avatar_url || undefined

    return await UserDatabaseService.createUser({
      email: supabaseUser.email,
      name,
      image,
      supabaseId: supabaseUser.id,
    })
  }
}
