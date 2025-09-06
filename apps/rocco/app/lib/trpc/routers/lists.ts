import {
  acceptListInvite as acceptListInviteService,
  createList as createListService,
  deleteListItem as deleteListItemService,
  deleteList as deleteListService,
  getListById as getListByIdService,
  getListInvites as getListInvitesService,
  getOwnedLists,
  getUserLists,
  sendListInvite as sendListInviteService,
  updateList as updateListService,
} from '@hominem/data'
import { item, list, place } from '@hominem/data/db/schema'
import { TRPCError } from '@trpc/server'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { safeAsync } from '../../errors'
import { logger } from '../../logger'
import { protectedProcedure, publicProcedure, router } from '../context'

export const listsRouter = router({
  getListOptions: protectedProcedure
    .input(z.object({ googleMapsId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found in context',
        })
      }

      // Get all lists for the user
      const userLists = await ctx.db.query.list.findMany({
        where: eq(list.userId, ctx.user.id),
        orderBy: [desc(list.updatedAt)],
      })

      // For each list, check if the place with googleMapsId is in the list
      const results = await Promise.all(
        userLists.map(async (l) => {
          const placeItems = await ctx.db.query.item.findMany({
            where: and(eq(item.listId, l.id), eq(item.itemType, 'PLACE')),
          })
          // Get all places for these items
          const placeIds = placeItems.map((i) => i.itemId)
          let isInList = false
          if (placeIds.length > 0) {
            const placesInList = await ctx.db.query.place.findMany({
              where: inArray(place.id, placeIds),
            })
            isInList = placesInList.some((p) => p.googleMapsId === input.googleMapsId)
          }
          return {
            ...l,
            isInList,
          }
        })
      )
      return results
    }),

  getAll: protectedProcedure
    .input(z.object({ itemType: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return safeAsync(
        async () => {
          if (!ctx.user) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'User not found in context',
            })
          }

          const itemType = input?.itemType

          const [ownedLists, sharedUserLists] = await Promise.all([
            getOwnedLists(ctx.user.id, itemType),
            getUserLists(ctx.user.id, itemType),
          ])

          logger.info('Retrieved user lists', {
            userId: ctx.user.id,
            count: ownedLists.length + sharedUserLists.length,
            itemType,
          })

          return [...ownedLists, ...sharedUserLists]
        },
        'getAll lists',
        { userId: ctx.user?.id, itemType: input?.itemType }
      )
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return safeAsync(
        async () => {
          const list = await getListByIdService(input.id, ctx.user?.id || null)

          if (!list) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'List not found',
            })
          }

          logger.info('Retrieved list by ID with places', {
            listId: input.id,
            userId: ctx.user?.id,
            isOwnList: list.isOwnList,
            placeCount: list.places.length,
          })

          return list
        },
        'getById list',
        { listId: input.id, userId: ctx.user?.id }
      )
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      try {
        const newList = await createListService(input.name, ctx.user.id)
        if (!newList) {
          throw new Error('Failed to create list')
        }
        return newList
      } catch (error) {
        logger.error('Error creating list', { error })
        throw new Error('Failed to create list')
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      const { id, name } = input

      if (!name) {
        throw new Error('Name is required for update')
      }

      const updatedList = await updateListService(id, name, ctx.user.id)
      if (!updatedList) {
        throw new Error("List not found or you don't have permission to update it")
      }

      return updatedList
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      const success = await deleteListService(input.id, ctx.user.id)
      if (!success) {
        throw new Error("List not found or you don't have permission to delete it")
      }

      return { success: true }
    }),

  // Delete a specific item from a list
  deleteItem: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        itemId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      try {
        const success = await deleteListItemService(input.listId, input.itemId)
        if (!success) {
          throw new Error('Failed to delete list item or item not found')
        }

        logger.info('Deleted item from list', {
          listId: input.listId,
          itemId: input.itemId,
          userId: ctx.user.id,
        })

        return { success: true }
      } catch (error) {
        logger.error('Error deleting list item', { error })
        throw new Error('Failed to delete list item')
      }
    }),

  // Get invites for a list
  getInvites: protectedProcedure
    .input(z.object({ listId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found in context',
        })
      }

      try {
        const invites = await getListInvitesService(input.listId)

        logger.info('Retrieved list invites', {
          listId: input.listId,
          userId: ctx.user.id,
          count: invites.length,
        })

        return invites
      } catch (error) {
        logger.error('Error fetching list invites', { error })
        throw new Error('Failed to fetch list invites')
      }
    }),

  // Send a list invite
  sendInvite: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      try {
        const serviceResponse = await sendListInviteService(input.listId, input.email, ctx.user.id)

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

        logger.info('Sent list invite', {
          listId: input.listId,
          invitedEmail: input.email,
          userId: ctx.user.id,
        })

        return serviceResponse
      } catch (error) {
        logger.error('Error sending list invite', { error })
        if (error instanceof TRPCError) {
          throw error
        }
        throw new Error('Failed to send list invite')
      }
    }),

  // Accept a list invite
  acceptInvite: protectedProcedure
    .input(z.object({ listId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.user.email) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found in context or email not available',
        })
      }

      try {
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

        logger.info('Accepted list invite', {
          listId: input.listId,
          userId: ctx.user.id,
          email: ctx.user.email,
        })

        return {
          message: 'Invite accepted successfully.',
          data: serviceResponse,
        }
      } catch (error) {
        logger.error('Error accepting list invite', { error })
        if (error instanceof TRPCError) {
          throw error
        }
        throw new Error('Failed to accept list invite')
      }
    }),
})
