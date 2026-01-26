import { addItemToList, getItemsByListId, removeItemFromList } from '@hominem/lists-services';
import { error, isServiceError, success } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';
import {
  itemsAddToListSchema,
  itemsRemoveFromListSchema,
  itemsGetByListIdSchema,
  type ItemsAddToListOutput,
  type ItemsRemoveFromListOutput,
  type ItemsGetByListIdOutput,
} from '../types/items.types';

/**
 * Items Routes
 *
 * Handles list item operations using the ApiResult pattern:
 * - Services throw typed errors
 * - HTTP endpoints catch errors and return ApiResult
 * - Clients receive discriminated union with `success` field
 */

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

      return c.json<ItemsAddToListOutput>(success(newItem as any), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<ItemsAddToListOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[items.add] unexpected error:', err);
      return c.json<ItemsAddToListOutput>(error('INTERNAL_ERROR', 'Failed to add item to list'), 500);
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
        return c.json<ItemsRemoveFromListOutput>(error('NOT_FOUND', 'Item not found in this list'), 404);
      }

      return c.json<ItemsRemoveFromListOutput>(success({ success: true }), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<ItemsRemoveFromListOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[items.remove] unexpected error:', err);
      return c.json<ItemsRemoveFromListOutput>(error('INTERNAL_ERROR', 'Failed to remove item from list'), 500);
    }
  })

  // Get items by list ID (public route)
  .post('/by-list', publicMiddleware, zValidator('json', itemsGetByListIdSchema), async (c) => {
    const input = c.req.valid('json');

    try {
      const items = await getItemsByListId(input.listId);

      return c.json<ItemsGetByListIdOutput>(success(items as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<ItemsGetByListIdOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[items.by-list] unexpected error:', err);
      return c.json<ItemsGetByListIdOutput>(error('INTERNAL_ERROR', 'Failed to fetch items'), 500);
    }
  });
