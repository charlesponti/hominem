import {
  createList,
  deleteList,
  deleteListItem,
  getAllUserListsWithPlaces,
  getListById,
  getPlaceLists,
  removeUserFromList,
  updateList,
} from '@hominem/lists-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import type {
  ListGetAllOutput,
  ListGetByIdOutput,
  ListCreateOutput,
  ListUpdateOutput,
  ListDeleteOutput,
  ListDeleteItemOutput,
  ListGetContainingPlaceOutput,
  ListRemoveCollaboratorOutput,
} from '../types/lists.types';

import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';

/**
 * Lists Routes
 *
 * Handles all list-related operations:
 * - POST /list - Get all user's lists
 * - POST /get - Get single list by ID
 * - POST /create - Create new list
 * - POST /update - Update existing list
 * - POST /delete - Delete list
 * - POST /delete-item - Delete item from list
 * - POST /containing-place - Get lists containing a specific place
 * - POST /remove-collaborator - Remove collaborator from list
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const listGetAllSchema = z.object({
  itemType: z.string().optional(),
});

const listGetByIdSchema = z.object({
  id: z.string().uuid(),
});

const listCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

const listUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

const listDeleteSchema = z.object({
  id: z.string().uuid(),
});

const listDeleteItemSchema = z.object({
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
});

const listGetContainingPlaceSchema = z.object({
  placeId: z.string().uuid().optional(),
  googleMapsId: z.string().optional(),
});

const listRemoveCollaboratorSchema = z.object({
  listId: z.string().uuid(),
  userId: z.string().uuid(),
});

// ============================================================================
// Routes
// ============================================================================

export const listsRoutes = new Hono<AppContext>()
  // List all user's lists with places
  .post('/list', authMiddleware, zValidator('json', listGetAllSchema), async (c) => {
    const userId = c.get('userId')!;

    try {
      const { ownedListsWithPlaces, sharedListsWithPlaces } =
        await getAllUserListsWithPlaces(userId);

      const result: ListGetAllOutput = [...ownedListsWithPlaces, ...sharedListsWithPlaces];
      return c.json(result);
    } catch (error) {
      console.error('[lists.list]', error);
      return c.json({ error: 'Failed to fetch lists' }, 500);
    }
  })

  // Get single list by ID (public route)
  .post('/get', publicMiddleware, zValidator('json', listGetByIdSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId') || null;

    try {
      const list = await getListById(input.id, userId);

      if (!list) {
        return c.json({ error: 'List not found' }, 404);
      }

      const result: ListGetByIdOutput = list;
      return c.json(result);
    } catch (error) {
      console.error('[lists.get]', error);
      return c.json({ error: 'Failed to fetch list' }, 500);
    }
  })

  // Create new list
  .post('/create', authMiddleware, zValidator('json', listCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const newList = await createList(input.name, userId);

      if (!newList) {
        return c.json({ error: 'Failed to create list' }, 500);
      }

      const result: ListCreateOutput = newList;
      return c.json(result);
    } catch (error) {
      console.error('[lists.create]', error);
      return c.json({ error: 'Failed to create list' }, 500);
    }
  })

  // Update existing list
  .post('/update', authMiddleware, zValidator('json', listUpdateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      if (!input.name) {
        return c.json({ error: 'Name is required for update' }, 400);
      }

      const updatedList = await updateList(input.id, input.name, userId);

      if (!updatedList) {
        return c.json({ error: "List not found or you don't have permission to update it" }, 403);
      }

      const result: ListUpdateOutput = updatedList;
      return c.json(result);
    } catch (error) {
      console.error('[lists.update]', error);
      return c.json({ error: 'Failed to update list' }, 500);
    }
  })

  // Delete list
  .post('/delete', authMiddleware, zValidator('json', listDeleteSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const success = await deleteList(input.id, userId);

      if (!success) {
        return c.json({ error: "List not found or you don't have permission to delete it" }, 403);
      }

      const result: ListDeleteOutput = { success: true };
      return c.json(result);
    } catch (error) {
      console.error('[lists.delete]', error);
      return c.json({ error: 'Failed to delete list' }, 500);
    }
  })

  // Delete item from list
  .post('/delete-item', authMiddleware, zValidator('json', listDeleteItemSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const success = await deleteListItem(input.listId, input.itemId, userId);

      if (!success) {
        return c.json(
          { error: "List item not found or you don't have permission to delete it" },
          403,
        );
      }

      const result: ListDeleteItemOutput = { success: true };
      return c.json(result);
    } catch (error) {
      console.error('[lists.delete-item]', error);
      return c.json({ error: 'Failed to delete list item' }, 500);
    }
  })

  // Get lists containing a specific place
  .post(
    '/containing-place',
    authMiddleware,
    zValidator('json', listGetContainingPlaceSchema),
    async (c) => {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      try {
        if (!(input.placeId || input.googleMapsId)) {
          return c.json([]);
        }

        const lists = await getPlaceLists({
          userId,
          placeId: input.placeId,
          googleMapsId: input.googleMapsId,
        });

        const result: ListGetContainingPlaceOutput = lists.map((list) => ({
          id: list.id,
          name: list.name,
          isOwner: true, // User fetched their own lists, so they own them
        }));
        return c.json(result);
      } catch (error) {
        console.error('[lists.containing-place]', error);
        return c.json({ error: 'Failed to fetch lists' }, 500);
      }
    },
  )

  // Remove collaborator from list
  .post(
    '/remove-collaborator',
    authMiddleware,
    zValidator('json', listRemoveCollaboratorSchema),
    async (c) => {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      try {
        const result = await removeUserFromList({
          listId: input.listId,
          userIdToRemove: input.userId,
          ownerId: userId,
        });

        if ('error' in result) {
          return c.json(
            { error: result.error },
            result.status === 403 ? 403 : result.status === 404 ? 404 : 500,
          );
        }

        const response: ListRemoveCollaboratorOutput = { success: true };
        return c.json(response);
      } catch (error) {
        console.error('[lists.remove-collaborator]', error);
        return c.json({ error: 'Failed to remove collaborator' }, 500);
      }
    },
  );
