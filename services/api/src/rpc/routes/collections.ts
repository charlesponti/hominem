import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  acceptMemberInvite,
  declineMemberInvite,
  listPendingInvites,
} from '../../application/collections.service';
import {
  acceptMemberInviteInputSchema,
  acceptMemberInviteOutputSchema,
  listPendingInvitesInputSchema,
  listPendingInvitesOutputSchema,
} from '../../schemas/collections.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const collectionsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/invites', zValidator('query', listPendingInvitesInputSchema), async (c) => {
    const result = await listPendingInvites(c.get('auth')!.userId, {
      ...c.req.valid('query'),
      kind: 'generic',
    });
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
  });
