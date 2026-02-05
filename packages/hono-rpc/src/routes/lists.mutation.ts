import {
  createList,
  deleteList,
  deleteListItem,
  getListById,
  removeUserFromList,
  updateList,
} from '@hominem/lists-services';
import { ForbiddenError, ValidationError, InternalError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';
import {
  listCreateSchema,
  listDeleteItemSchema,
  listDeleteSchema,
  listRemoveCollaboratorSchema,
  listUpdateSchema,
} from '../schemas/lists.schema'
import type {
  List,
  ListCreateOutput,
  ListDeleteItemOutput,
  ListDeleteOutput,
  ListRemoveCollaboratorOutput,
  ListUpdateOutput,
} from '../types/lists.types'

/**
 * Transform list from service layer to API contract
 * Converts null values to undefined for exactOptionalPropertyTypes compatibility
 */
function transformListToApiFormat(list: any): List {
  return {
    ...list,
    createdBy: list.createdBy ? {
      id: list.createdBy.id,
      email: list.createdBy.email,
      name: list.createdBy.name ?? undefined, // null -> undefined
    } : null,
    users: list.users?.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name ?? undefined, // null -> undefined
      image: user.image ?? undefined, // null -> undefined
    })),
    items: list.items?.map((item: any) => ({
      ...item,
      place: item.place ?? undefined,
      flight: item.flight ?? undefined,
    })),
  };
}

export const listMutationRoutes = new Hono<AppContext>()
  // Create new list
  .post('/create', authMiddleware, zValidator('json', listCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const newList = await createList(input.name, userId);

    if (!newList) {
      throw new InternalError('Failed to create list');
    }

    return c.json<ListCreateOutput>(transformListToApiFormat(newList), 201);
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

    // Fetch full list with all relations to match API contract
    const fullList = await getListById(input.id, userId);
    if (!fullList) {
      throw new InternalError('Failed to fetch updated list');
    }

    return c.json<ListUpdateOutput>(transformListToApiFormat(fullList), 200);
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
        const statusCode = result.status ?? 500;
        if (statusCode === 403) {
          throw new ForbiddenError(String(result.error) || 'Operation failed');
        } else if (statusCode === 404) {
          throw new (await import('@hominem/services')).NotFoundError(
            String(result.error) || 'Operation failed',
          );
        } else {
          throw new InternalError(String(result.error) || 'Operation failed');
        }
      }

      return c.json<ListRemoveCollaboratorOutput>({ success: true }, 200);
    },
  );
