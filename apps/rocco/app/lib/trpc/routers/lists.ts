import {
  createList,
  deleteList,
  deleteListItem,
  getAllUserListsWithPlaces,
  getListById,
  getListsContainingPlace,
  removeUserFromList,
  updateList,
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
          const { ownedListsWithPlaces, sharedListsWithPlaces } = await getAllUserListsWithPlaces(
            ctx.user.id
          )

          return [...ownedListsWithPlaces, ...sharedListsWithPlaces]
        },
        'getAll lists',
        { userId: ctx.user?.id, itemType: input?.itemType }
      )
    }),

  getById: publicProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
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
        id: z.uuid(),
        name: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name } = input

      if (!name) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Name is required for update',
        })
      }

      // Service function checks ownership in WHERE clause
      const updatedList = await updateList(id, name, ctx.user.id)
      if (!updatedList) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "List not found or you don't have permission to update it",
        })
      }

      return updatedList
    }),

  delete: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    // Service function checks ownership in WHERE clause
    const success = await deleteList(input.id, ctx.user.id)
    if (!success) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "List not found or you don't have permission to delete it",
      })
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
      try {
        // Service function checks access (owner or collaborator) in WHERE clause
        const success = await deleteListItem(input.listId, input.itemId, ctx.user.id)
        if (!success) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "List item not found or you don't have permission to delete it",
          })
        }

        return { success: true }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        logger.error('Error deleting list item', { error })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete list item',
        })
      }
    }),

  // Get lists containing a specific place (optimized, returns only essential fields)
  getContainingPlace: protectedProcedure
    .input(
      z.object({
        placeId: z.uuid().optional(),
        googleMapsId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return safeAsync(
        async () => {
          if (!(input.placeId || input.googleMapsId)) {
            return []
          }

          return await getListsContainingPlace(ctx.user.id, input.placeId, input.googleMapsId)
        },
        'getContainingPlace lists',
        {
          userId: ctx.user?.id,
          placeId: input.placeId,
          googleMapsId: input.googleMapsId,
        }
      )
    }),

  // Remove a collaborator from a list
  removeCollaborator: protectedProcedure
    .input(
      z.object({
        listId: z.uuid(),
        userId: z.uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await removeUserFromList({
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
