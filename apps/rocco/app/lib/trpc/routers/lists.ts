import {
  createList,
  deleteListItem as deleteListItemService,
  deleteList as deleteListService,
  formatList,
  getListById as getListByIdService,
  getListPlacesMap,
  getOwnedLists,
  getUserLists,
  updateList as updateListService,
} from '@hominem/data'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { safeAsync } from '../../errors'
import { logger } from '../../logger'
import { protectedProcedure, publicProcedure, router } from '../context'

async function loadListsWithPlaces(userId: string) {
  const [ownedLists, sharedUserLists] = await Promise.all([
    getOwnedLists(userId),
    getUserLists(userId),
  ])

  const allListIds = [...ownedLists.map((l) => l.id), ...sharedUserLists.map((l) => l.id)]
  const placesMap = await getListPlacesMap(allListIds)

  const ownedListsWithPlaces = ownedLists.map((listData) => {
    const places = placesMap.get(listData.id) || []
    return formatList(listData, places, true, true)
  })

  const sharedListsWithPlaces = sharedUserLists.map((listData) => {
    const places = placesMap.get(listData.id) || []
    return formatList(listData, places, false, true)
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

          const { ownedListsWithPlaces, sharedListsWithPlaces } = await loadListsWithPlaces(
            ctx.user.id
          )

          return [...ownedListsWithPlaces, ...sharedListsWithPlaces]
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
        const newList = await createList(input.name, ctx.user.id)
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
})
