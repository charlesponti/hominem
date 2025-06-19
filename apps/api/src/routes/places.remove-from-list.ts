import { db } from '@hominem/utils/db'
import { item as itemTable, list as listTable, place as placesTable } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { and, eq, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'

const DeletePlaceFromListParamsSchema = z.object({
  listId: z.string().uuid(),
  placeId: z.string().uuid(),
})

export const placesRemoveFromListRoutes = new Hono()

// Remove place from a specific list
placesRemoveFromListRoutes.delete(
  '/:listId/:placeId',
  requireAuth,
  zValidator('param', DeletePlaceFromListParamsSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Unauthorized: User ID is missing' }, 401)
    }

    const { listId, placeId: googleMapsIdOrDbId } = c.req.valid('param')

    try {
      const listAuthCheck = await db.query.list.findFirst({
        where: and(eq(listTable.id, listId), eq(listTable.userId, userId)),
      })

      if (!listAuthCheck) {
        return c.json({ error: 'Forbidden: You do not own this list.' }, 403)
      }

      const placeToDelete = await db.query.place.findFirst({
        where: or(
          eq(placesTable.id, googleMapsIdOrDbId),
          eq(placesTable.googleMapsId, googleMapsIdOrDbId)
        ),
        columns: { id: true },
      })

      if (!placeToDelete) {
        return c.json({ error: 'Place not found in database.' }, 404)
      }

      const internalPlaceId = placeToDelete.id

      const deletedItems = await db
        .delete(itemTable)
        .where(
          and(
            eq(itemTable.listId, listId),
            eq(itemTable.itemId, internalPlaceId),
            eq(itemTable.itemType, 'PLACE'),
            eq(itemTable.userId, userId)
          )
        )
        .returning({ id: itemTable.id })

      if (deletedItems.length === 0) {
        return c.json(
          {
            error: 'Place not found in this list, or you do not have permission to remove it.',
          },
          404
        )
      }

      return c.json({ message: 'Place removed from list successfully' })
    } catch (error) {
      console.error('Error deleting place from list:', error, {
        userId,
        listId,
        googleMapsIdOrDbId,
      })
      return c.json({ error: 'Failed to delete place from list' }, 500)
    }
  }
)
