import {
  acceptListInvite as acceptListInviteService,
  deleteInviteByListAndToken,
  deleteListInvite as deleteListInviteService,
  getInviteByListAndToken,
  getListInvites as getListInvitesService,
  getListOwnedByUser,
  getOutboundInvites,
  isUserMemberOfList,
  sendListInvite as sendListInviteService,
} from '@hominem/data'
import { getInviteByToken, getInvitesForUser } from '@hominem/data/lists'
import { UserAuthService } from '@hominem/data/user'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, router } from '../context'

export const invitesRouter = router({
  getReceived: protectedProcedure
    .input(
      z
        .object({
          token: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const normalizedEmail = ctx.user.email?.toLowerCase()
      const tokenFilter = input?.token

      const baseInvites = await getInvitesForUser(ctx.user.id, normalizedEmail)

      const filteredBaseInvites = baseInvites
        .filter((invite) => invite.list?.userId !== ctx.user.id)
        .map((invite) => ({ ...invite, belongsToAnotherUser: false }))

      let tokenInvite:
        | ((typeof baseInvites)[number] & { belongsToAnotherUser: boolean })
        | undefined

      if (tokenFilter) {
        const inviteByToken = await getInviteByToken(tokenFilter)

        if (!inviteByToken) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Invite not found',
          })
        }

        // Ignore token (and invite) if the user owns the target list
        const inviteList = inviteByToken.list
        if (inviteList && inviteList.userId !== ctx.user.id) {
          const belongsToAnotherUser =
            (inviteByToken.invitedUserId && inviteByToken.invitedUserId !== ctx.user.id) ||
            (normalizedEmail &&
              inviteByToken.invitedUserEmail &&
              inviteByToken.invitedUserEmail.toLowerCase() !== normalizedEmail)

          tokenInvite = {
            ...inviteByToken,
            list: inviteList,
            belongsToAnotherUser: Boolean(belongsToAnotherUser),
          }
        }
      }

      const invites: Array<(typeof baseInvites)[number] & { belongsToAnotherUser: boolean }> =
        tokenInvite
          ? [
              tokenInvite,
              ...filteredBaseInvites.filter((invite) => invite.token !== tokenInvite?.token),
            ]
          : filteredBaseInvites

      return invites
    }),

  // Get invites sent by the current user (outbound)
  getSent: protectedProcedure.query(async ({ ctx }) => {
    return await getOutboundInvites(ctx.user.id)
  }),

  // Get all invites for a specific list
  getByList: protectedProcedure
    .input(z.object({ listId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      // Only allow if user owns the list
      const listItem = await getListOwnedByUser(input.listId, ctx.user.id)
      if (!listItem) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "List not found or you don't have permission",
        })
      }

      return await getListInvitesService(input.listId)
    }),

  create: protectedProcedure
    .input(
      z.object({
        listId: z.uuid(),
        invitedUserEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedEmail = input.invitedUserEmail.toLowerCase()

      // Prevent self-invites
      if (normalizedEmail === ctx.user.email?.toLowerCase()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot invite yourself to a list',
        })
      }

      // Check if user owns the list
      const listItem = await getListOwnedByUser(input.listId, ctx.user.id)

      if (!listItem) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "List not found or you don't have permission to invite users to it",
        })
      }

      // Check if the invited user is already a member
      const invitedUser = await UserAuthService.getUserByEmail(normalizedEmail)

      if (invitedUser) {
        const isAlreadyMember = await isUserMemberOfList(input.listId, invitedUser.id)

        if (isAlreadyMember) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This user is already a member of this list',
          })
        }
      }

      // Use service layer for consistency
      const baseUrl = process.env.VITE_APP_BASE_URL
      if (!baseUrl) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Base URL not configured',
        })
      }

      const serviceResponse = await sendListInviteService(
        input.listId,
        normalizedEmail,
        ctx.user.id,
        baseUrl
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
        listId: z.uuid(),
        token: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.email) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User email not available',
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

      const updatedInvite = await getInviteByListAndToken({
        listId: input.listId,
        token: input.token,
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
        listId: z.uuid(),
        token: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invite = await getInviteByListAndToken({
        listId: input.listId,
        token: input.token,
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

      const deleted = await deleteInviteByListAndToken({
        listId: input.listId,
        token: input.token,
      })

      if (!deleted) {
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
        listId: z.uuid(),
        invitedUserEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
