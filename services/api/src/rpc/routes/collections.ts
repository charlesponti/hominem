import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  acceptMemberInvite,
  collectionDetail,
  createCollection,
  declineMemberInvite,
  deleteCollection,
  inviteMember,
  leaveCollection,
  listCollections,
  listPendingInvites,
  removeCollectionItem,
  removeMember,
  updateCollection,
  updateMemberRole,
} from '../../application/collections.service';
import {
  acceptMemberInviteInputSchema,
  acceptMemberInviteOutputSchema,
  collectionDetailOutputSchema,
  createCollectionInputSchema,
  createCollectionOutputSchema,
  deleteCollectionOutputSchema,
  inviteMemberInputSchema,
  inviteMemberOutputSchema,
  leaveCollectionOutputSchema,
  listCollectionsInputSchema,
  listCollectionsOutputSchema,
  listPendingInvitesInputSchema,
  listPendingInvitesOutputSchema,
  removeCollectionItemOutputSchema,
  removeMemberOutputSchema,
  updateCollectionInputSchema,
  updateCollectionOutputSchema,
  updateMemberRoleInputSchema,
  updateMemberRoleOutputSchema,
} from '../../schemas/collections.schema';
import { entityTypeSchema } from '../../schemas/tags.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';

const collectionParamSchema = z.object({ collectionId: z.string().uuid() });
const memberParamSchema = collectionParamSchema.extend({ memberId: z.string().uuid() });
const itemParamSchema = collectionParamSchema.extend({
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
});

export const collectionsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', listCollectionsInputSchema), async (c) => {
    const result = await listCollections(c.get('auth')!.userId, c.req.valid('query'));
    return c.json(listCollectionsOutputSchema.parse(result));
  })
  .post('/', zValidator('json', createCollectionInputSchema), async (c) => {
    const result = await createCollection(c.get('auth')!.userId, c.req.valid('json'));
    return c.json(createCollectionOutputSchema.parse(result));
  })
  .get('/invites', zValidator('query', listPendingInvitesInputSchema), async (c) => {
    const result = await listPendingInvites(c.get('auth')!.userId, c.req.valid('query'));
    return c.json(listPendingInvitesOutputSchema.parse(result));
  })
  .post('/invites/:collectionId/accept', async (c) => {
    const result = await acceptMemberInvite(
      c.get('auth')!.userId,
      acceptMemberInviteInputSchema.parse({ collectionId: c.req.param('collectionId') }),
    );
    return c.json(acceptMemberInviteOutputSchema.parse(result));
  })
  .post('/invites/:collectionId/decline', async (c) => {
    const result = await declineMemberInvite(
      c.get('auth')!.userId,
      acceptMemberInviteInputSchema.parse({ collectionId: c.req.param('collectionId') }),
    );
    return c.json(result);
  })
  .get('/:collectionId', zValidator('param', collectionParamSchema), async (c) => {
    const { collectionId } = c.req.valid('param');
    const result = await collectionDetail(c.get('auth')!.userId, collectionId);
    return c.json(collectionDetailOutputSchema.parse(result));
  })
  .patch(
    '/:collectionId',
    zValidator('param', collectionParamSchema),
    zValidator('json', updateCollectionInputSchema.omit({ collectionId: true })),
    async (c) => {
      const { collectionId } = c.req.valid('param');
      const body = c.req.valid('json');
      const result = await updateCollection(c.get('auth')!.userId, { ...body, collectionId });
      return c.json(updateCollectionOutputSchema.parse(result));
    },
  )
  .delete('/:collectionId', zValidator('param', collectionParamSchema), async (c) => {
    const { collectionId } = c.req.valid('param');
    const result = await deleteCollection(c.get('auth')!.userId, { collectionId });
    return c.json(deleteCollectionOutputSchema.parse(result));
  })
  .post('/:collectionId/leave', zValidator('param', collectionParamSchema), async (c) => {
    const { collectionId } = c.req.valid('param');
    const result = await leaveCollection(c.get('auth')!.userId, { collectionId });
    return c.json(leaveCollectionOutputSchema.parse(result));
  })
  .delete(
    '/:collectionId/items/:entityType/:entityId',
    zValidator('param', itemParamSchema),
    async (c) => {
      const { collectionId, entityType, entityId } = c.req.valid('param');
      const result = await removeCollectionItem(c.get('auth')!.userId, {
        collectionId,
        entityType,
        entityId,
      });
      return c.json(removeCollectionItemOutputSchema.parse(result));
    },
  )
  .post(
    '/:collectionId/members',
    zValidator('param', collectionParamSchema),
    zValidator('json', inviteMemberInputSchema.omit({ collectionId: true })),
    async (c) => {
      const { collectionId } = c.req.valid('param');
      const body = c.req.valid('json');
      const result = await inviteMember(c.get('auth')!.userId, { ...body, collectionId });
      return c.json(inviteMemberOutputSchema.parse(result));
    },
  )
  .patch(
    '/:collectionId/members/:memberId',
    zValidator('param', memberParamSchema),
    zValidator('json', updateMemberRoleInputSchema.pick({ role: true })),
    async (c) => {
      const { collectionId, memberId } = c.req.valid('param');
      const { role } = c.req.valid('json');
      const result = await updateMemberRole(c.get('auth')!.userId, {
        collectionId,
        memberId,
        role,
      });
      return c.json(updateMemberRoleOutputSchema.parse(result));
    },
  )
  .delete('/:collectionId/members/:memberId', zValidator('param', memberParamSchema), async (c) => {
    const { collectionId, memberId } = c.req.valid('param');
    const result = await removeMember(c.get('auth')!.userId, { collectionId, memberId });
    return c.json(removeMemberOutputSchema.parse(result));
  });
