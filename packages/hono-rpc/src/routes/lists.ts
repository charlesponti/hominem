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
import { error, isServiceError, success } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';

/**
 * Lists Routes
 *
 * Handles all list-related operations using the new API contract pattern:
 * - Services throw typed errors
 * - HTTP endpoints catch errors and return ApiResult
 * - Clients receive discriminated union with `success` field
 *
 * Operations:
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

// Export schemas for type derivation
export {
  listGetAllSchema,
  listGetByIdSchema,
  listCreateSchema,
  listUpdateSchema,
  listDeleteSchema,
  listDeleteItemSchema,
  listGetContainingPlaceSchema,
  listRemoveCollaboratorSchema,
};

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

      const result = [...ownedListsWithPlaces, ...sharedListsWithPlaces];
      return c.json(success(result), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[lists.list]', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch lists'), 500);
    }
  })

  // Get single list by ID (public route)
  .post('/get', publicMiddleware, zValidator('json', listGetByIdSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId') || null;

    try {
      const list = await getListById(input.id, userId);

      if (!list) {
        return c.json(error('NOT_FOUND', 'List not found'), 404);
      }

      return c.json(success(list), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[lists.get]', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch list'), 500);
    }
  })

  // Create new list
  .post('/create', authMiddleware, zValidator('json', listCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const newList = await createList(input.name, userId);

      if (!newList) {
        return c.json(error('INTERNAL_ERROR', 'Failed to create list'), 500);
      }

      return c.json(success(newList), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[lists.create]', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to create list'), 500);
    }
  })

  // Update existing list
  .post('/update', authMiddleware, zValidator('json', listUpdateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      if (!input.name) {
        return c.json(
          error('VALIDATION_ERROR', 'Name is required for update', { field: 'name' }),
          400,
        );
      }

      const updatedList = await updateList(input.id, input.name, userId);

      if (!updatedList) {
        return c.json(error('FORBIDDEN', "You don't have permission to update this list"), 403);
      }

      return c.json(success(updatedList), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[lists.update]', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to update list'), 500);
    }
  })

  // Delete list
  .post('/delete', authMiddleware, zValidator('json', listDeleteSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const deleteSuccess = await deleteList(input.id, userId);

      if (!deleteSuccess) {
        return c.json(error('FORBIDDEN', "You don't have permission to delete this list"), 403);
      }

      return c.json(success({ success: true }), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[lists.delete]', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to delete list'), 500);
    }
  })

  // Delete item from list
  .post('/delete-item', authMiddleware, zValidator('json', listDeleteItemSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const deleteSuccess = await deleteListItem(input.listId, input.itemId, userId);

      if (!deleteSuccess) {
        return c.json(
          error('FORBIDDEN', "You don't have permission to delete this list item"),
          403,
        );
      }

      return c.json(success({ success: true }), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[lists.delete-item]', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to delete list item'), 500);
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
          return c.json(success([]), 200);
        }

        const lists = await getPlaceLists({
          userId,
          placeId: input.placeId,
          googleMapsId: input.googleMapsId,
        });

        const result = lists.map((list) => ({
          id: list.id,
          name: list.name,
          isOwner: true,
        }));
        return c.json(success(result), 200);
      } catch (err) {
        if (isServiceError(err)) {
          return c.json(error(err.code, err.message, err.details), err.statusCode as any);
        }

        console.error('[lists.containing-place]', err);
        return c.json(error('INTERNAL_ERROR', 'Failed to fetch lists'), 500);
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
          const statusCode = (result.status ?? 500) as any;
          const errorCode =
            statusCode === 403 ? 'FORBIDDEN' : statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR';
          return c.json(
            error(errorCode, (result.error as string) || 'Operation failed'),
            statusCode as any,
          );
        }

        return c.json(success({ success: true }), 200);
      } catch (err) {
        if (isServiceError(err)) {
          return c.json(error(err.code, err.message, err.details), err.statusCode as any);
        }

        console.error('[lists.remove-collaborator]', err);
        return c.json(error('INTERNAL_ERROR', 'Failed to remove collaborator'), 500);
      }
    },
  );
