import { type SupabaseAuthUser, UserAuthService } from '@hominem/auth/server';
import { z } from 'zod';

import { protectedProcedure, router } from '../procedures';

export const userRouter = router({
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedUser = await UserAuthService.updateProfileBySupabaseId(ctx.supabaseId, {
          name: input.name,
          image: input.image,
        });

        if (!updatedUser) {
          throw new Error('User not found');
        }

        return updatedUser;
      } catch (error) {
        throw new Error(
          `Failed to update user profile: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),

  findOrCreate: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        image: z.string().optional(),
      }),
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
        };

        const user = await UserAuthService.findOrCreateUser(supabaseUser as SupabaseAuthUser);
        return user;
      } catch (error) {
        throw new Error(
          `Failed to find or create user: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),
});
