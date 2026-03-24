import { addItemToList, getItemsByListId, removeItemFromList } from '@hominem/lists-services';
import {
  itemsAddToListSchema,
  itemsGetByListIdSchema,
  itemsRemoveFromListSchema,
} from '@hominem/rpc/schemas/items.schema';
import type {
  ListItem,
  ItemsAddToListOutput,
  ItemsGetByListIdOutput,
  ItemsRemoveFromListOutput,
} from '@hominem/rpc/types/items.types';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { NotFoundError } from '../errors';
import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';

/**
 * Transform item from service layer to API contract
 * Converts null values to undefined for exactOptionalPropertyTypes compatibility
 */
function transformItemToApiFormat(item: unknown): ListItem {
  const typedItem = item as Record<string, unknown>;
  return {
    ...typedItem,
    place: typedItem.place ?? undefined,
    flight: typedItem.flight ?? undefined,
  } as ListItem;
}

/**
 * Items Routes
 *
 * Handles list item operations using direct JSON responses:
 * - Services throw typed errors
 * - HTTP endpoints return concrete response bodies
 * - Error middleware handles failure responses
 */

// ============================================================================
// Routes
// ============================================================================

export const itemsRoutes = new Hono<AppContext>()
  // Add item to list
  .post('/add', authMiddleware, zValidator('json', itemsAddToListSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const itemType = input.itemType === 'FLIGHT' ? 'FLIGHT' : 'PLACE';

    const newItem = await addItemToList({
      listId: input.listId,
      itemId: input.itemId,
      itemType,
      userId: userId,
    });

    return c.json<ItemsAddToListOutput>(transformItemToApiFormat(newItem), 201);
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

    return c.json<ItemsGetByListIdOutput>(items.map(transformItemToApiFormat), 200);
  });
