import { getAllUserListsWithPlaces, getListById, getPlaceLists } from '@hominem/lists-services';
import { NotFoundError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';
import {
  listGetAllSchema,
  listGetByIdSchema,
  listGetContainingPlaceSchema,
} from '../schemas/lists.schema'
import type {
  List,
  ListGetAllOutput,
  ListGetByIdOutput,
  ListGetContainingPlaceOutput,
} from '../types/lists.types'

/**
 * Transform list from service layer to API contract
 * Converts null values to undefined for exactOptionalPropertyTypes compatibility
 */
function transformListToApiFormat(list: unknown): List {
  const typedList = list as Record<string, unknown>;
  return {
    ...typedList,
    createdBy: typedList.createdBy ? {
      id: (typedList.createdBy as { id: string }).id,
      email: (typedList.createdBy as { email: string }).email,
      name: (typedList.createdBy as { name?: string | null }).name ?? undefined,
    } : null,
    users: (typedList.users as Array<Record<string, unknown>> | undefined)?.map((user) => ({
      id: (user.id as string) || '',
      email: (user.email as string) || '',
      name: (user.name as string | null | undefined) ?? undefined,
      image: (user.image as string | null | undefined) ?? undefined,
    })),
    items: (typedList.items as Array<Record<string, unknown>> | undefined)?.map((item) => ({
      id: (item.id as string) || '',
      listId: (item.listId as string) || '',
      itemId: (item.itemId as string) || '',
      itemType: (item.itemType as string) || '',
      place: item.place,
      flight: item.flight,
      createdAt: (item.createdAt as string) || '',
      updatedAt: (item.updatedAt as string) || '',
    })),
  } as List;
}

export const listQueryRoutes = new Hono<AppContext>()
  // ListOutput all user's lists with places
  .post('/list', authMiddleware, zValidator('json', listGetAllSchema), async (c) => {
    const userId = c.get('userId')!;

    const { ownedListsWithPlaces, sharedListsWithPlaces } = await getAllUserListsWithPlaces(userId);

    const result = [...ownedListsWithPlaces, ...sharedListsWithPlaces];

    return c.json<ListGetAllOutput>(result.map(transformListToApiFormat), 200);
  })

  // Get single list by ID (public route)
  .post('/get', publicMiddleware, zValidator('json', listGetByIdSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId') || null;

    const list = await getListById(input.id, userId);

    if (!list) {
      throw new NotFoundError('ListOutput not found');
    }

    return c.json<ListGetByIdOutput>(transformListToApiFormat(list), 200);
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
        ...(input.placeId && { placeId: input.placeId }),
        ...(input.googleMapsId && { googleMapsId: input.googleMapsId }),
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
  );
