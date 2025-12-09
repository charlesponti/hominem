import { db, UserAuthService } from '@hominem/data'
import { users } from '@hominem/data/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { protectedProcedure, router } from '../procedures.js'

export const userRouter = router({
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
          .where(eq(users.supabaseId, ctx.supabaseId))
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
          id: ctx.supabaseId,
          email: input.email,
          user_metadata: {
            name: input.name,
            avatar_url: input.image,
          },
          app_metadata: {
            isAdmin: false,
          },
        }

        const userAuthData = await UserAuthService.findOrCreateUser(supabaseUser)

        const [user] = await db.select().from(users).where(eq(users.id, userAuthData.id))
        if (!user) {
          throw new Error('User not found after creation')
        }

        return user
      } catch (error) {
        throw new Error(
          `Failed to find or create user: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),
})
