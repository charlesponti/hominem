import {
  acceptListInvite as acceptListInviteService,
  createList as createListService,
  deleteListItem as deleteListItemService,
  deleteList as deleteListService,
  formatList,
  getListById as getListByIdService,
  getListInvites as getListInvitesService,
  getListPlacesMap,
  getOwnedLists,
  getUserLists,
  getOwnedListsWithItemCount,
  getUserListsWithItemCount,
  sendListInvite as sendListInviteService,
  updateList as updateListService,
} from '@hominem/data'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { safeAsync } from '../../errors'
import { logger } from '../../logger'
import { protectedProcedure, publicProcedure, router } from '../context'

async function loadListsWithPlaces(userId: string, itemType?: string) {
  const [ownedLists, sharedUserLists] = await Promise.all([
    getOwnedLists(userId),
    getUserLists(userId),
  ])

  const allListIds = [...ownedLists.map((l) => l.id), ...sharedUserLists.map((l) => l.id)]
  const placesMap = await getListPlacesMap(allListIds)

  const ownedListsWithPlaces = ownedLists.map((listData) => {
    const places = placesMap.get(listData.id) || []
    return formatList(listData, places, true)
  })

  const sharedListsWithPlaces = sharedUserLists.map((listData) => {
    const places = placesMap.get(listData.id) || []
    return formatList(listData, places, false)
  })

  return {
    ownedListsWithPlaces,
    sharedListsWithPlaces,
  }
}

async function loadListsWithPlacesWithItemCounts(userId: string, itemType?: string) {
  const [ownedLists, sharedUserLists] = await Promise.all([
    getOwnedListsWithItemCount(userId, itemType),
    getUserListsWithItemCount(userId, itemType),
  ])

  const allListIds = [...ownedLists.map((l) => l.id), ...sharedUserLists.map((l) => l.id)]
  const placesMap = await getListPlacesMap(allListIds)

  const ownedListsWithPlaces = ownedLists.map((listData) => {
    const places = placesMap.get(listData.id) || []
    return formatList(listData, places, true)
  })

  const sharedListsWithPlaces = sharedUserLists.map((listData) => {
    const places = placesMap.get(listData.id) || []
    return formatList(listData, places, false)
  })

  return {
    ownedListsWithPlaces,
    sharedListsWithPlaces,
  }
}

export const listsRouter = router({
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
          const { ownedListsWithPlaces, sharedListsWithPlaces } = await loadListsWithPlaces(
            ctx.user.id,
            itemType
          )

          logger.info('Retrieved user lists', {
            userId: ctx.user.id,
            count: ownedListsWithPlaces.length + sharedListsWithPlaces.length,
            itemType,
          })

          return [...ownedListsWithPlaces, ...sharedListsWithPlaces]
        },
        'getAll lists',
        { userId: ctx.user?.id, itemType: input?.itemType }
      )
    }),

  getListsWithItems: protectedProcedure
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
          const { ownedListsWithPlaces, sharedListsWithPlaces } = await loadListsWithPlacesWithItemCounts(
            ctx.user.id,
            itemType
          )

          logger.info('Retrieved user lists with items', {
            userId: ctx.user.id,
            count: ownedListsWithPlaces.length + sharedListsWithPlaces.length,
            itemType,
          })

          return [...ownedListsWithPlaces, ...sharedListsWithPlaces]
        },
        'getListsWithItems',
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
