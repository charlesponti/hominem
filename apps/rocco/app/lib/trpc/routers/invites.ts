import {
  acceptListInvite as acceptListInviteService,
  getListInvites as getListInvitesService,
  sendListInvite as sendListInviteService,
} from '@hominem/data'
import { list, listInvite, userLists, users } from '@hominem/data/db/schema/index'
import { and, eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '../context'

export const invitesRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not found in context',
      })
    }

    // Query invites with related list data in a single request
    const userInvites = await ctx.db.query.listInvite.findMany({
      where: eq(listInvite.invitedUserEmail, ctx.user.email),
      with: {
        list: true, // Include the related list data
      },
    })

    return userInvites
  }),

  // Get invites sent by the current user (outbound)
  getAllOutbound: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not found in context',
      })
    }

    const outboundInvites = await ctx.db.query.listInvite.findMany({
      where: eq(listInvite.userId, ctx.user.id),
      with: {
        list: true,
      },
    })

    return outboundInvites.map((invite) => ({
      ...invite,
      user: null, // User info not available
    }))
  }),

  // Get all invites for a specific list
  getByList: protectedProcedure
    .input(z.object({ listId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found in context',
        })
      }

      // Only allow if user owns the list
      const listItem = await ctx.db.query.list.findFirst({
        where: and(eq(list.id, input.listId), eq(list.userId, ctx.user.id)),
      })
      if (!listItem) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "List not found or you don't have permission",
        })
      }

      // Use service layer for consistency
      const invites = await getListInvitesService(input.listId)

      // Attach list info to each invite
      return invites.map((invite) => ({ ...invite, list: listItem }))
    }),

  create: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        invitedUserEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found in context',
        })
      }

      // Prevent self-invites
      if (input.invitedUserEmail.toLowerCase() === ctx.user.email?.toLowerCase()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot invite yourself to a list',
        })
      }

      // Check if user owns the list
      const listItem = await ctx.db.query.list.findFirst({
        where: and(eq(list.id, input.listId), eq(list.userId, ctx.user.id)),
      })

      if (!listItem) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "List not found or you don't have permission to invite users to it",
        })
      }

      // Check if the invited user is already a member
      const invitedUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.invitedUserEmail),
      })

      if (invitedUser) {
        const isAlreadyMember = await ctx.db.query.userLists.findFirst({
          where: and(
            eq(userLists.listId, input.listId),
            eq(userLists.userId, invitedUser.id)
          ),
        })

        if (isAlreadyMember) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This user is already a member of this list',
          })
        }
      }

      // Use service layer for consistency
      const serviceResponse = await sendListInviteService(
        input.listId,
        input.invitedUserEmail,
        ctx.user.id
      )

      if ('error' in serviceResponse) {
        throw new TRPCError({
          code:
            serviceResponse.status === 404
              ? 'NOT_FOUND'
              : serviceResponse.status === 409
                ? 'CONFLICT'
                : 'INTERNAL_SERVER_ERROR',
          message: serviceResponse.error,
        })
      }

      return serviceResponse
    }),

  accept: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        invitedUserEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.user.email) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found in context or email not available',
        })
      }

      // Verify the invite is for the current user
      if (input.invitedUserEmail.toLowerCase() !== ctx.user.email.toLowerCase()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only accept invites sent to your email',
        })
      }

      // Use service layer to properly grant list access via user_lists table
      const serviceResponse = await acceptListInviteService(
        input.listId,
        ctx.user.id,
        ctx.user.email
      )

      if ('error' in serviceResponse) {
        throw new TRPCError({
          code:
            serviceResponse.status === 404
              ? 'NOT_FOUND'
              : serviceResponse.status === 400
                ? 'BAD_REQUEST'
                : serviceResponse.status === 403
                  ? 'FORBIDDEN'
                  : 'INTERNAL_SERVER_ERROR',
          message: serviceResponse.error,
        })
      }

      // Return the updated invite record for backward compatibility
      const updatedInvite = await ctx.db.query.listInvite.findFirst({
        where: and(
          eq(listInvite.listId, input.listId),
          eq(listInvite.invitedUserEmail, input.invitedUserEmail)
        ),
      })

      if (!updatedInvite) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Invite was accepted but could not be retrieved',
        })
      }

      return updatedInvite
    }),

  decline: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        invitedUserEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found in context',
        })
      }

      // Verify the invite is for the current user
      if (input.invitedUserEmail.toLowerCase() !== ctx.user.email?.toLowerCase()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only decline invites sent to your email',
        })
      }

      const deletedInvite = await ctx.db
        .delete(listInvite)
        .where(
          and(
            eq(listInvite.listId, input.listId),
            eq(listInvite.invitedUserEmail, input.invitedUserEmail)
          )
        )
        .returning()

      if (deletedInvite.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite not found',
        })
      }

      return { success: true }
    }),
})
