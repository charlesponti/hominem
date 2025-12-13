import { addItemToList, getItemsByListId, removeItemFromList } from '@hominem/data'
import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '../context'

export const itemsRouter = router({
  addToList: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        itemId: z.string().uuid(),
        itemType: z.enum(['FLIGHT', 'PLACE']).default('PLACE'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      const newItem = await addItemToList({
        listId: input.listId,
        itemId: input.itemId,
        itemType: input.itemType,
        userId: ctx.user.id,
      })

      return newItem
    }),

  removeFromList: protectedProcedure
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

      const removed = await removeItemFromList({
        listId: input.listId,
        itemId: input.itemId,
        userId: ctx.user.id,
      })

      if (!removed) {
        throw new Error('Item not found in this list')
      }

      return { success: true }
    }),

  getByListId: publicProcedure
    .input(z.object({ listId: z.string().uuid() }))
    .query(async ({ input }) => getItemsByListId(input.listId)),
})
