import {
  acceptListInvite as acceptListInviteService,
  deleteListInvite as deleteListInviteService,
  getListInvites as getListInvitesService,
  sendListInvite as sendListInviteService,
} from '@hominem/data'
import { list, listInvite, userLists, users } from '@hominem/data/db/schema/index'
import { TRPCError } from '@trpc/server'
import { and, eq, or } from 'drizzle-orm'
import { z } from 'zod'
import { protectedProcedure, router } from '../context'

export const invitesRouter = router({
  getAll: protectedProcedure
    .input(
      z
        .object({
          token: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found in context',
        })
      }

      const normalizedEmail = ctx.user.email?.toLowerCase()
      const tokenFilter = input?.token
      const ownershipClause = normalizedEmail
        ? or(
            eq(listInvite.invitedUserId, ctx.user.id),
            eq(listInvite.invitedUserEmail, normalizedEmail)
          )
        : eq(listInvite.invitedUserId, ctx.user.id)
      const whereClause = tokenFilter
        ? and(eq(listInvite.token, tokenFilter), ownershipClause)
        : ownershipClause

      // Query invites with related list data in a single request
      const userInvites = await ctx.db.query.listInvite.findMany({
        where: whereClause,
        with: {
          list: true, // Include the related list data
        },
      })

      if (tokenFilter && userInvites.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite not found',
        })
      }

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

      const normalizedEmail = input.invitedUserEmail.toLowerCase()

      // Prevent self-invites
      if (normalizedEmail === ctx.user.email?.toLowerCase()) {
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
        where: eq(users.email, normalizedEmail),
      })

      if (invitedUser) {
        const isAlreadyMember = await ctx.db.query.userLists.findFirst({
          where: and(eq(userLists.listId, input.listId), eq(userLists.userId, invitedUser.id)),
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
        normalizedEmail,
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
        token: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.user.email) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found in context or email not available',
        })
      }

      const serviceResponse = await acceptListInviteService(input.listId, ctx.user.id, input.token)

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
        where: and(eq(listInvite.listId, input.listId), eq(listInvite.token, input.token)),
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
        token: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found in context',
        })
      }

      const invite = await ctx.db.query.listInvite.findFirst({
        where: and(eq(listInvite.listId, input.listId), eq(listInvite.token, input.token)),
      })

      if (!invite) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite not found',
        })
      }

      if (invite.invitedUserId && invite.invitedUserId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This invite belongs to a different user',
        })
      }

      const deletedInvite = await ctx.db
        .delete(listInvite)
        .where(and(eq(listInvite.listId, input.listId), eq(listInvite.token, input.token)))
        .returning()

      if (deletedInvite.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite not found',
        })
      }

      return { success: true }
    }),

  delete: protectedProcedure
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

      const result = await deleteListInviteService({
        listId: input.listId,
        invitedUserEmail: input.invitedUserEmail,
        userId: ctx.user.id,
      })

      if ('error' in result) {
        throw new TRPCError({
          code:
            result.status === 404
              ? 'NOT_FOUND'
              : result.status === 400
                ? 'BAD_REQUEST'
                : result.status === 403
                  ? 'FORBIDDEN'
                  : 'INTERNAL_SERVER_ERROR',
          message: result.error,
        })
      }

      return result
    }),
})
