import { addItemToList, getItemsByListId, removeItemFromList } from '@hominem/lists-services';
import { error, isServiceError, success } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';

/**
 * Items Routes
 *
 * Handles list item operations using the ApiResult pattern:
 * - Services throw typed errors
 * - HTTP endpoints catch errors and return ApiResult
 * - Clients receive discriminated union with `success` field
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const itemsAddToListSchema = z.object({
  listId: z.uuid(),
  itemId: z.uuid(),
  itemType: z.enum(['FLIGHT', 'PLACE']).default('PLACE'),
});

const itemsRemoveFromListSchema = z.object({
  listId: z.uuid(),
  itemId: z.uuid(),
});

const itemsGetByListIdSchema = z.object({
  listId: z.uuid(),
});

// Export schemas for type derivation
export { itemsAddToListSchema, itemsRemoveFromListSchema, itemsGetByListIdSchema };

// ============================================================================
// Routes
// ============================================================================

export const itemsRoutes = new Hono<AppContext>()
  // Add item to list
  .post('/add', authMiddleware, zValidator('json', itemsAddToListSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const newItem = await addItemToList({
        listId: input.listId,
        itemId: input.itemId,
        itemType: input.itemType,
        userId: userId,
      });

      return c.json(success(newItem), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[items.add] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to add item to list'), 500);
    }
  })

  // Remove item from list
  .post('/remove', authMiddleware, zValidator('json', itemsRemoveFromListSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const removed = await removeItemFromList({
        listId: input.listId,
        itemId: input.itemId,
        userId: userId,
      });

      if (!removed) {
        return c.json(error('NOT_FOUND', 'Item not found in this list'), 404);
      }

      return c.json(success({ success: true }), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[items.remove] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to remove item from list'), 500);
    }
  })

  // Get items by list ID (public route)
  .post('/by-list', publicMiddleware, zValidator('json', itemsGetByListIdSchema), async (c) => {
    const input = c.req.valid('json');

    try {
      const items = await getItemsByListId(input.listId);

      return c.json(success(items), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[items.by-list] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch items'), 500);
    }
  });
