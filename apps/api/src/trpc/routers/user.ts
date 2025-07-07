import { z } from 'zod'
import { protectedProcedure, router } from '../index.js'
import { users, type User, type UserInsert } from '@hominem/data/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '@hominem/data'

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

export const userRouter = router({
  // Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      const user = await UserDatabaseService.findBySupabaseId(ctx.supabaseId!)
      if (!user) {
        throw new Error('User not found')
      }
      return user
    } catch (error) {
      throw new Error(
        `Failed to get user profile: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [updatedUser] = await db
          .update(users)
          .set({
            name: input.name || null,
            image: input.image || null,
            photoUrl: input.image || null,
          })
          .where(eq(users.supabaseId, ctx.supabaseId!))
          .returning()

        if (!updatedUser) {
          throw new Error('User not found')
        }

        return updatedUser
      } catch (error) {
        throw new Error(
          `Failed to update user profile: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Find or create user (for auth flows)
  findOrCreate: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const supabaseUser = {
          id: ctx.supabaseId!,
          email: input.email,
          user_metadata: {
            name: input.name,
            avatar_url: input.image,
          },
        }

        return await UserDatabaseService.findOrCreateUser(supabaseUser)
      } catch (error) {
        throw new Error(
          `Failed to find or create user: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),
})
