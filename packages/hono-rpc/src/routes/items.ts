import { addItemToList, getItemsByListId, removeItemFromList } from '@hominem/lists-services';
import { NotFoundError } from '@hominem/services'
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';
import {
  itemsAddToListSchema,
  itemsGetByListIdSchema,
  itemsRemoveFromListSchema,
} from '../schemas/items.schema'
import type {
  ItemsAddToListOutput,
  ItemsGetByListIdOutput,
  ItemsRemoveFromListOutput,
} from '../types/items.types'

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

    const newItem = await addItemToList({
      listId: input.listId,
      itemId: input.itemId,
      itemType: input.itemType ?? 'FLIGHT',
      userId: userId,
    });

    return c.json<ItemsAddToListOutput>(newItem as any, 201);
  })

  // Remove item from list
  .post('/remove', authMiddleware, zValidator('json', itemsRemoveFromListSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const removed = await removeItemFromList({
      listId: input.listId,
      itemId: input.itemId,
      userId: userId,
    });

    if (!removed) {
      throw new NotFoundError('ItemOutput not found in this list');
    }

    return c.json<ItemsRemoveFromListOutput>({ success: true }, 200);
  })

  // Get items by list ID (public route)
  .post('/by-list', publicMiddleware, zValidator('json', itemsGetByListIdSchema), async (c) => {
    const input = c.req.valid('json');

    const items = await getItemsByListId(input.listId);

    return c.json<ItemsGetByListIdOutput>(items as any, 200);
  });
