import { item, list } from '@hominem/data/db/schema/index'
import { and, desc, eq } from 'drizzle-orm'
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

      // Check if user owns the list
      const listItem = await ctx.db.query.list.findFirst({
        where: and(eq(list.id, input.listId), eq(list.userId, ctx.user.id)),
      })

      if (!listItem) {
        throw new Error("List not found or you don't have permission to add items to it")
      }

      // Check if item is already in list
      const existingItem = await ctx.db.query.item.findFirst({
        where: and(eq(item.listId, input.listId), eq(item.itemId, input.itemId)),
      })

      if (existingItem) {
        throw new Error('Item is already in this list')
      }

      const newItem = await ctx.db
        .insert(item)
        .values({
          id: crypto.randomUUID(),
          ...input,
          userId: ctx.user.id,
          type: input.itemType,
        })
        .returning()

      return newItem[0]
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

      // Check if user owns the list
      const listItem = await ctx.db.query.list.findFirst({
        where: and(eq(list.id, input.listId), eq(list.userId, ctx.user.id)),
      })

      if (!listItem) {
        throw new Error("List not found or you don't have permission to remove items from it")
      }

      const deletedItem = await ctx.db
        .delete(item)
        .where(and(eq(item.listId, input.listId), eq(item.itemId, input.itemId)))
        .returning()

      if (deletedItem.length === 0) {
        throw new Error('Item not found in this list')
      }

      return { success: true }
    }),

  getByListId: publicProcedure
    .input(z.object({ listId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.item.findMany({
        where: eq(item.listId, input.listId),
        orderBy: [desc(item.createdAt)],
      })

      return items
    }),
})
