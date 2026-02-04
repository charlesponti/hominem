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
  ListGetAllOutput,
  ListGetByIdOutput,
  ListGetContainingPlaceOutput,
} from '../types/lists.types'

export const listQueryRoutes = new Hono<AppContext>()
  // ListOutput all user's lists with places
  .post('/list', authMiddleware, zValidator('json', listGetAllSchema), async (c) => {
    const userId = c.get('userId')!;

    const { ownedListsWithPlaces, sharedListsWithPlaces } = await getAllUserListsWithPlaces(userId);

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
