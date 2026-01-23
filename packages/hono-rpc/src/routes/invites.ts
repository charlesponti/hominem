import { UserAuthService } from '@hominem/auth/server';
import {
  acceptListInvite as acceptListInviteService,
  deleteInviteByListAndToken,
  deleteListInvite,
  getInviteByListAndToken,
  getInviteByToken,
  getInvitesForUser,
  getListInvites,
  getListOwnedByUser,
  getOutboundInvites,
  isUserMemberOfList,
  sendListInvite,
} from '@hominem/lists-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import type {
  InvitesGetReceivedOutput,
  InvitesGetSentOutput,
  InvitesGetByListOutput,
  InvitesCreateOutput,
  InvitesAcceptOutput,
  InvitesDeclineOutput,
  InvitesDeleteOutput,
} from '../types/invites.types';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Invites Routes
 *
 * Handles list invitation operations
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const invitesGetReceivedSchema = z.object({
  token: z.string().optional(),
});

const invitesGetByListSchema = z.object({
  listId: z.string().uuid(),
});

const invitesCreateSchema = z.object({
  listId: z.string().uuid(),
  invitedUserEmail: z.string().email(),
});

const invitesAcceptSchema = z.object({
  listId: z.string().uuid(),
  token: z.string(),
});

const invitesDeclineSchema = z.object({
  listId: z.string().uuid(),
  token: z.string(),
});

const invitesDeleteSchema = z.object({
  listId: z.string().uuid(),
  invitedUserEmail: z.string().email(),
});

// ============================================================================
// Routes
// ============================================================================

export const invitesRoutes = new Hono<AppContext>()
  // Get received invites
  .post('/received', authMiddleware, zValidator('json', invitesGetReceivedSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const user = c.get('user')!;

    try {
      const normalizedEmail = user.email?.toLowerCase();
      const tokenFilter = input.token;

      const baseInvites = await getInvitesForUser(userId, normalizedEmail);

      const filteredBaseInvites = baseInvites
        .filter((invite: any) => invite.list?.userId !== userId)
        .map((invite: any) => ({ ...invite, belongsToAnotherUser: false }));

      let tokenInvite:
        | ((typeof baseInvites)[number] & { belongsToAnotherUser: boolean })
        | undefined;

      if (tokenFilter) {
        const inviteByToken = await getInviteByToken(tokenFilter);

        if (!inviteByToken) {
          return c.json({ error: 'Invite not found' }, 404);
        }

        const inviteList = inviteByToken.list;
        if (inviteList && inviteList.userId !== userId) {
          const belongsToAnotherUser =
            (inviteByToken.invitedUserId && inviteByToken.invitedUserId !== userId) ||
            (normalizedEmail &&
              inviteByToken.invitedUserEmail &&
              inviteByToken.invitedUserEmail.toLowerCase() !== normalizedEmail);

          tokenInvite = {
            ...inviteByToken,
            list: inviteList,
            belongsToAnotherUser: Boolean(belongsToAnotherUser),
          };
        }
      }

      const invites: InvitesGetReceivedOutput = tokenInvite
        ? [
            tokenInvite,
            ...filteredBaseInvites.filter((invite: any) => invite.token !== tokenInvite?.token),
          ]
        : filteredBaseInvites;

      return c.json(invites);
    } catch (error) {
      console.error('[invites.received]', error);
      return c.json({ error: 'Failed to fetch invites' }, 500);
    }
  })

  // Get sent invites
  .post('/sent', authMiddleware, async (c) => {
    const userId = c.get('userId')!;

    try {
      const invites: InvitesGetSentOutput = await getOutboundInvites(userId);
      return c.json(invites);
    } catch (error) {
      console.error('[invites.sent]', error);
      return c.json({ error: 'Failed to fetch sent invites' }, 500);
    }
  })

  // Get invites by list
  .post('/by-list', authMiddleware, zValidator('json', invitesGetByListSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const listItem = await getListOwnedByUser(input.listId, userId);
      if (!listItem) {
        return c.json({ error: "List not found or you don't have permission" }, 403);
      }

      const invites: InvitesGetByListOutput = await getListInvites(input.listId);
      return c.json(invites);
    } catch (error) {
      console.error('[invites.by-list]', error);
      return c.json({ error: 'Failed to fetch invites' }, 500);
    }
  })

  // Create invite
  .post('/create', authMiddleware, zValidator('json', invitesCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const user = c.get('user')!;

    try {
      const normalizedEmail = input.invitedUserEmail.toLowerCase();

      // Prevent self-invites
      if (normalizedEmail === user.email?.toLowerCase()) {
        return c.json({ error: 'You cannot invite yourself to a list' }, 400);
      }

      // Check if user owns the list
      const listItem = await getListOwnedByUser(input.listId, userId);
      if (!listItem) {
        return c.json(
          { error: "List not found or you don't have permission to invite users to it" },
          403,
        );
      }

      // Check if the invited user is already a member
      const invitedUser = await UserAuthService.getUserByEmail(normalizedEmail);
      if (invitedUser) {
        const isAlreadyMember = await isUserMemberOfList(input.listId, invitedUser.id);
        if (isAlreadyMember) {
          return c.json({ error: 'This user is already a member of this list' }, 409);
        }
      }

      const baseUrl = process.env.VITE_APP_BASE_URL;
      if (!baseUrl) {
        return c.json({ error: 'Base URL not configured' }, 500);
      }

      const serviceResponse = await sendListInvite(input.listId, normalizedEmail, userId, baseUrl);

      if ('error' in serviceResponse) {
        return c.json(
          { error: serviceResponse.error },
          serviceResponse.status === 404 ? 404 : serviceResponse.status === 409 ? 409 : 500,
        );
      }

      const result: InvitesCreateOutput = serviceResponse;
      return c.json(result);
    } catch (error) {
      console.error('[invites.create]', error);
      return c.json({ error: 'Failed to create invite' }, 500);
    }
  })

  // Accept invite
  .post('/accept', authMiddleware, zValidator('json', invitesAcceptSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const user = c.get('user')!;

    try {
      if (!user.email) {
        return c.json({ error: 'User email not available' }, 401);
      }

      const serviceResponse = await acceptListInviteService(input.listId, userId, input.token);

      if ('error' in serviceResponse) {
        return c.json(
          { error: serviceResponse.error },
          serviceResponse.status === 404
            ? 404
            : serviceResponse.status === 400
              ? 400
              : serviceResponse.status === 403
                ? 403
                : 500,
        );
      }

      const updatedInvite = await getInviteByListAndToken({
        listId: input.listId,
        token: input.token,
      });

      if (!updatedInvite) {
        return c.json({ error: 'Invite was accepted but could not be retrieved' }, 500);
      }

      const result: InvitesAcceptOutput = updatedInvite;
      return c.json(result);
    } catch (error) {
      console.error('[invites.accept]', error);
      return c.json({ error: 'Failed to accept invite' }, 500);
    }
  })

  // Decline invite
  .post('/decline', authMiddleware, zValidator('json', invitesDeclineSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const invite = await getInviteByListAndToken({
        listId: input.listId,
        token: input.token,
      });

      if (!invite) {
        return c.json({ error: 'Invite not found' }, 404);
      }

      if (invite.invitedUserId && invite.invitedUserId !== userId) {
        return c.json({ error: 'This invite belongs to a different user' }, 403);
      }

      const deleted = await deleteInviteByListAndToken({
        listId: input.listId,
        token: input.token,
      });

      if (!deleted) {
        return c.json({ error: 'Invite not found' }, 404);
      }

      const result: InvitesDeclineOutput = { success: true };
      return c.json(result);
    } catch (error) {
      console.error('[invites.decline]', error);
      return c.json({ error: 'Failed to decline invite' }, 500);
    }
  })

  // Delete invite
  .post('/delete', authMiddleware, zValidator('json', invitesDeleteSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await deleteListInvite({
        listId: input.listId,
        invitedUserEmail: input.invitedUserEmail,
        userId: userId,
      });

      if ('error' in result) {
        return c.json(
          { error: result.error },
          result.status === 404
            ? 404
            : result.status === 400
              ? 400
              : result.status === 403
                ? 403
                : 500,
        );
      }

      const response: InvitesDeleteOutput = result;
      return c.json(response);
    } catch (error) {
      console.error('[invites.delete]', error);
      return c.json({ error: 'Failed to delete invite' }, 500);
    }
  });
