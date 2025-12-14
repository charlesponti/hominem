import {
  createList,
  deleteListItem as deleteListItemService,
  deleteList as deleteListService,
  getAllUserListsWithPlaces,
  getListById,
  getListsContainingPlace,
  removeUserFromList as removeUserFromListService,
  updateList as updateListService,
} from '@hominem/data'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { safeAsync } from '../../errors'
import { logger } from '../../logger'
import { protectedProcedure, publicProcedure, router } from '../context'

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

          const { ownedListsWithPlaces, sharedListsWithPlaces } = await getAllUserListsWithPlaces(
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
          const list = await getListById(input.id, ctx.user?.id || null)

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

      const updatedList = await updateListService(id, name)
      if (!updatedList) {
        throw new Error("List not found or you don't have permission to update it")
      }

      return updatedList
    }),

  delete: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
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
        listId: z.uuid(),
        itemId: z.uuid(),
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

        return { success: true }
      } catch (error) {
        logger.error('Error deleting list item', { error })
        throw new Error('Failed to delete list item')
      }
    }),

  // Get lists containing a specific place (optimized, returns only essential fields)
  getContainingPlace: protectedProcedure
    .input(
      z.object({
        placeId: z.string().uuid().optional(),
        googleMapsId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return safeAsync(
        async () => {
          if (!ctx.user) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'User not found in context',
            })
          }

          if (!input.placeId && !input.googleMapsId) {
            return []
          }

          return await getListsContainingPlace(ctx.user.id, input.placeId, input.googleMapsId)
        },
        'getContainingPlace lists',
        { userId: ctx.user?.id, placeId: input.placeId, googleMapsId: input.googleMapsId }
      )
    }),

  // Remove a collaborator from a list
  removeCollaborator: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found in context',
        })
      }

      const result = await removeUserFromListService({
        listId: input.listId,
        userIdToRemove: input.userId,
        ownerId: ctx.user.id,
      })

      if ('error' in result) {
        throw new TRPCError({
          code:
            result.status === 403
              ? 'FORBIDDEN'
              : result.status === 404
                ? 'NOT_FOUND'
                : result.status === 400
                  ? 'BAD_REQUEST'
                  : 'INTERNAL_SERVER_ERROR',
          message: result.error,
        })
      }

      return { success: true }
    }),
})
