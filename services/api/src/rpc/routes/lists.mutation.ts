import {
  createList,
  deleteList,
  deleteListItem,
  removeUserFromList,
  updateList,
} from '@hominem/lists-services';
import {
  listCreateSchema,
  listDeleteItemSchema,
  listDeleteSchema,
  listRemoveCollaboratorSchema,
  listUpdateSchema,
} from '@hominem/rpc/schemas/lists.schema';
import type {
  ListCreateOutput,
  ListDeleteItemOutput,
  ListDeleteOutput,
  ListRemoveCollaboratorOutput,
  ListUpdateOutput,
} from '@hominem/rpc/types/lists.types';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { forbidden, internal, notFound, validation } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { transformListToApiFormat } from '../utils/lists-transforms';

export const listMutationRoutes = new Hono<AppContext>()
  // Create new list
  .post('/create', authMiddleware, zValidator('json', listCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const newList = await createList(input.name, userId);

    if (!newList) {
      throw internal('Failed to create list');
    }

    return c.json<ListCreateOutput>(transformListToApiFormat(newList), 201);
  })

  // Update existing list
  .post('/update', authMiddleware, zValidator('json', listUpdateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    if (!input.name) {
      throw validation('Name is required for update', 'name');
    }

    const updatedList = await updateList(input.id, input.name, userId);

    if (!updatedList) {
      throw forbidden("You don't have permission to update this list");
    }

    return c.json<ListUpdateOutput>(transformListToApiFormat(updatedList), 200);
  })

  // Delete list
  .post('/delete', authMiddleware, zValidator('json', listDeleteSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const deleteSuccess = await deleteList(input.id, userId);

    if (!deleteSuccess) {
      throw forbidden("You don't have permission to delete this list");
    }

    return c.json<ListDeleteOutput>({ success: true }, 200);
  })

  // Delete item from list
  .post('/delete-item', authMiddleware, zValidator('json', listDeleteItemSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const deleteSuccess = await deleteListItem(input.listId, input.itemId, userId);

    if (!deleteSuccess) {
      throw forbidden("You don't have permission to delete this list item");
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
        if (statusCode === 400) {
          throw validation(String(result.error) || 'Operation failed');
        } else if (statusCode === 403) {
          throw forbidden(String(result.error) || 'Operation failed');
        } else if (statusCode === 404) {
          throw { ...notFound('List'), message: String(result.error) || 'Operation failed' };
        } else {
          throw internal(String(result.error) || 'Operation failed');
        }
      }

      return c.json<ListRemoveCollaboratorOutput>({ success: true }, 200);
    },
  );
