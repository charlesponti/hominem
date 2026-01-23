import { addItemToList, getItemsByListId, removeItemFromList } from '@hominem/lists-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import type {
  ItemsAddToListOutput,
  ItemsRemoveFromListOutput,
  ItemsGetByListIdOutput,
} from '../types/items.types';

import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';

/**
 * Items Routes
 *
 * Handles list item operations
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const itemsAddToListSchema = z.object({
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  itemType: z.enum(['FLIGHT', 'PLACE']).default('PLACE'),
});

const itemsRemoveFromListSchema = z.object({
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
});

const itemsGetByListIdSchema = z.object({
  listId: z.string().uuid(),
});

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

      const result: ItemsAddToListOutput = newItem;
      return c.json(result);
    } catch (error) {
      console.error('[items.add]', error);
      return c.json({ error: 'Failed to add item to list' }, 500);
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
        return c.json({ error: 'Item not found in this list' }, 404);
      }

      const result: ItemsRemoveFromListOutput = { success: true };
      return c.json(result);
    } catch (error) {
      console.error('[items.remove]', error);
      return c.json({ error: 'Failed to remove item from list' }, 500);
    }
  })

  // Get items by list ID (public route)
  .post('/by-list', publicMiddleware, zValidator('json', itemsGetByListIdSchema), async (c) => {
    const input = c.req.valid('json');

    try {
      const items = await getItemsByListId(input.listId);

      const result: ItemsGetByListIdOutput = items;
      return c.json(result);
    } catch (error) {
      console.error('[items.by-list]', error);
      return c.json({ error: 'Failed to fetch items' }, 500);
    }
  });
