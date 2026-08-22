import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  acceptCollaboratorInvite,
  addPlaceToList,
  createPlaceList,
  inviteCollaborator,
  listMyPendingInvites,
  listPlaceLists,
  placeListDetail,
  removePlaceFromList,
} from '../../application/place-lists.service';
import {
  acceptCollaboratorInviteInputSchema,
  acceptCollaboratorInviteOutputSchema,
  addPlaceToListBodySchema,
  addPlaceToListOutputSchema,
  createPlaceListInputSchema,
  createPlaceListOutputSchema,
  inviteCollaboratorInputSchema,
  inviteCollaboratorOutputSchema,
  listPendingInvitesInputSchema,
  listPendingInvitesOutputSchema,
  listPlaceListsInputSchema,
  listPlaceListsOutputSchema,
  placeListDetailOutputSchema,
  removePlaceFromListInputSchema,
  removePlaceFromListOutputSchema,
} from '../../schemas/place-lists.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const placeListsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', listPlaceListsInputSchema), async (c) => {
    const result = await listPlaceLists(c.get('auth')!.userId, c.req.valid('query'));
    return c.json(listPlaceListsOutputSchema.parse(result));
  })
  .post('/', zValidator('json', createPlaceListInputSchema), async (c) => {
    const result = await createPlaceList(c.get('auth')!.userId, c.req.valid('json'));
    return c.json(createPlaceListOutputSchema.parse(result), 201);
  })
  .get('/invites', zValidator('query', listPendingInvitesInputSchema), async (c) => {
    const result = await listMyPendingInvites(c.get('auth')!.userId, c.req.valid('query'));
    return c.json(listPendingInvitesOutputSchema.parse(result));
  })
  .get('/:placeListId', async (c) => {
    const result = await placeListDetail(c.get('auth')!.userId, c.req.param('placeListId'));
    return c.json(placeListDetailOutputSchema.parse(result));
  })
  .post('/:placeListId/places', zValidator('json', addPlaceToListBodySchema), async (c) => {
    const result = await addPlaceToList(c.get('auth')!.userId, {
      ...c.req.valid('json'),
      placeListId: c.req.param('placeListId'),
    });
    return c.json(addPlaceToListOutputSchema.parse(result), 201);
  })
  .delete(
    '/:placeListId/places/:placeId',
    zValidator('param', removePlaceFromListInputSchema),
    async (c) => {
      const result = await removePlaceFromList(c.get('auth')!.userId, c.req.valid('param'));
      return c.json(removePlaceFromListOutputSchema.parse(result));
    },
  )
  .post(
    '/:placeListId/collaborators',
    zValidator('json', inviteCollaboratorInputSchema.omit({ placeListId: true })),
    async (c) => {
      const result = await inviteCollaborator(c.get('auth')!.userId, {
        ...c.req.valid('json'),
        placeListId: c.req.param('placeListId'),
      });
      return c.json(inviteCollaboratorOutputSchema.parse(result), 201);
    },
  )
  .post('/:placeListId/collaborators/accept', async (c) => {
    const result = await acceptCollaboratorInvite(
      c.get('auth')!.userId,
      acceptCollaboratorInviteInputSchema.parse({ placeListId: c.req.param('placeListId') }),
    );
    return c.json(acceptCollaboratorInviteOutputSchema.parse(result));
  });
