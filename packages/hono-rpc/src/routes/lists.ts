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
import { NotFoundError, ForbiddenError, ValidationError, InternalError, isServiceError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';
import {
  listGetAllSchema,
  listGetByIdSchema,
  listCreateSchema,
  listUpdateSchema,
  listDeleteSchema,
  listDeleteItemSchema,
  listGetContainingPlaceSchema,
  listRemoveCollaboratorSchema,
  type ListGetAllOutput,
  type ListGetByIdOutput,
  type ListCreateOutput,
  type ListUpdateOutput,
  type ListDeleteOutput,
  type ListDeleteItemOutput,
  type ListGetContainingPlaceOutput,
  type ListRemoveCollaboratorOutput,
} from '../types/lists.types';

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
// Routes
// ============================================================================

export const listsRoutes = new Hono<AppContext>()
  // ListOutput all user's lists with places
  .post('/list', authMiddleware, zValidator('json', listGetAllSchema), async (c) => {
    const userId = c.get('userId')!;

    const { ownedListsWithPlaces, sharedListsWithPlaces } =
      await getAllUserListsWithPlaces(userId);

    const result = [...ownedListsWithPlaces, ...sharedListsWithPlaces];
    return c.json<ListGetAllOutput>(result as any, 200);
  })

  // Get single list by ID (public route)
  .post('/get', publicMiddleware, zValidator('json', listGetByIdSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId') || null;

    const list = await getListById(input.id, userId);

    if (!list) {
      throw new NotFoundError('ListOutput not found');
    }

    return c.json<ListGetByIdOutput>(list as any, 200);
  })

  // Create new list
  .post('/create', authMiddleware, zValidator('json', listCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const newList = await createList(input.name, userId);

    if (!newList) {
      throw new InternalError('Failed to create list');
    }

    return c.json<ListCreateOutput>(newList as any, 201);
  })

  // Update existing list
  .post('/update', authMiddleware, zValidator('json', listUpdateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    if (!input.name) {
      throw new ValidationError('Name is required for update', { field: 'name' });
    }

    const updatedList = await updateList(input.id, input.name, userId);

    if (!updatedList) {
      throw new ForbiddenError("You don't have permission to update this list");
    }

    return c.json<ListUpdateOutput>(updatedList as any, 200);
  })

  // Delete list
  .post('/delete', authMiddleware, zValidator('json', listDeleteSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const deleteSuccess = await deleteList(input.id, userId);

    if (!deleteSuccess) {
      throw new ForbiddenError("You don't have permission to delete this list");
    }

    return c.json<ListDeleteOutput>({ success: true }, 200);
  })

  // Delete item from list
  .post('/delete-item', authMiddleware, zValidator('json', listDeleteItemSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const deleteSuccess = await deleteListItem(input.listId, input.itemId, userId);

    if (!deleteSuccess) {
      throw new ForbiddenError("You don't have permission to delete this list item");
    }

    return c.json<ListDeleteItemOutput>({ success: true }, 200);
  })

  // Get lists containing a specific place
  .post(
    '/containing-place',
    authMiddleware,
    zValidator('json', listGetContainingPlaceSchema),
    async (c) => {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      if (!(input.placeId || input.googleMapsId)) {
        return c.json<ListGetContainingPlaceOutput>([], 200);
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
        itemCount: list.itemCount,
        imageUrl: list.imageUrl,
      }));
      return c.json<ListGetContainingPlaceOutput>(result, 200);
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

      const result = await removeUserFromList({
        listId: input.listId,
        userIdToRemove: input.userId,
        ownerId: userId,
      });

      if ('error' in result) {
        const statusCode = (result.status ?? 500) as any;
        const errorCode =
          statusCode === 403 ? 'FORBIDDEN' : statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR';
        
        if (statusCode === 403) {
          throw new ForbiddenError((result.error as string) || 'Operation failed');
        } else if (statusCode === 404) {
          throw new NotFoundError((result.error as string) || 'Operation failed');
        } else {
          throw new InternalError((result.error as string) || 'Operation failed');
        }
      }

      return c.json<ListRemoveCollaboratorOutput>({ success: true }, 200);
    },
  );
