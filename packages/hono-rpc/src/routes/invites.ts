import { UserAuthService } from '@hominem/auth/server';
import {
  acceptListInvite,
  deleteInviteByListAndToken,
  deleteListInvite,
  getInviteByListAndToken,
  getInviteByToken,
  getInvitesForUser,
  getListInvites,
  getOutboundInvites,
  isUserMemberOfList,
  sendListInvite,
  type SendListInviteParams,
  type AcceptListInviteParams,
  type DeleteListInviteParams,
} from '@hominem/lists-services';
import { getListOwnedByUser } from '@hominem/lists-services';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  isServiceError,
  error,
  success,
} from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

// ============================================================================
// Validation Schemas
// ============================================================================

const invitesGetReceivedSchema = z.object({
  token: z.string().optional(),
});

const invitesGetByListSchema = z.object({
  listId: z.uuid(),
});

const invitesCreateSchema = z.object({
  listId: z.uuid(),
  invitedUserEmail: z.email(),
});

const invitesAcceptSchema = z.object({
  listId: z.uuid(),
  token: z.string().min(1, 'Token is required'),
});

const invitesDeclineSchema = z.object({
  listId: z.uuid(),
  token: z.string().min(1, 'Token is required'),
});

const invitesDeleteSchema = z.object({
  listId: z.uuid(),
  invitedUserEmail: z.email(),
});

// Export schemas for type derivation
export {
  invitesGetReceivedSchema,
  invitesGetByListSchema,
  invitesCreateSchema,
  invitesAcceptSchema,
  invitesDeclineSchema,
  invitesDeleteSchema,
};

// ============================================================================
// Routes
// ============================================================================

export const invitesRoutes = new Hono<AppContext>()
  // Get received invites (no service call - query operation)
  .post('/received', authMiddleware, zValidator('json', invitesGetReceivedSchema), async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;
      const user = c.get('user')!;

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
        if (inviteByToken) {
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
      }

      const invites = tokenInvite
        ? [
            tokenInvite,
            ...filteredBaseInvites.filter((invite: any) => invite.token !== tokenInvite?.token),
          ]
        : filteredBaseInvites;

      return c.json(success(invites), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[invites.received] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch invites'), 500);
    }
  })

  // Get sent invites
  .post('/sent', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;

      const invites = await getOutboundInvites(userId);

      return c.json(success(invites), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[invites.sent] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch sent invites'), 500);
    }
  })

  // Get invites by list
  .post('/by-list', authMiddleware, zValidator('json', invitesGetByListSchema), async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      const listItem = await getListOwnedByUser(input.listId, userId);
      if (!listItem) {
        return c.json(
          error('FORBIDDEN', "You don't have permission to access this list's invites"),
          403,
        );
      }

      const invites = await getListInvites(input.listId);

      return c.json(success(invites), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[invites.by-list] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch invites'), 500);
    }
  })

  // Create invite
  .post('/create', authMiddleware, zValidator('json', invitesCreateSchema), async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;
      const user = c.get('user')!;

      const normalizedEmail = input.invitedUserEmail.toLowerCase();

      // Prevent self-invites
      if (normalizedEmail === user.email?.toLowerCase()) {
        return c.json(error('VALIDATION_ERROR', 'You cannot invite yourself to a list'), 400);
      }

      // Check if user owns the list
      const listItem = await getListOwnedByUser(input.listId, userId);
      if (!listItem) {
        return c.json(
          error('FORBIDDEN', "You don't have permission to invite users to this list"),
          403,
        );
      }

      // Check if the invited user is already a member
      const invitedUser = await UserAuthService.getUserByEmail(normalizedEmail);
      if (invitedUser) {
        const isAlreadyMember = await isUserMemberOfList(input.listId, invitedUser.id);
        if (isAlreadyMember) {
          return c.json(error('CONFLICT', 'This user is already a member of this list'), 409);
        }
      }

      const baseUrl = process.env.VITE_APP_BASE_URL;
      if (!baseUrl) {
        return c.json(error('INTERNAL_ERROR', 'Server configuration error'), 500);
      }

      // Call service function with properly typed params
      const params: SendListInviteParams = {
        listId: input.listId,
        invitedUserEmail: normalizedEmail,
        invitingUserId: userId,
        baseUrl,
      };

      const result = await sendListInvite(params);

      return c.json(success(result), 201);
    } catch (err) {
      if (err instanceof ConflictError) {
        return c.json(error(err.code, err.message, err.details), 409);
      }
      if (err instanceof NotFoundError) {
        return c.json(error(err.code, err.message, err.details), 404);
      }
      if (err instanceof ValidationError) {
        return c.json(error(err.code, err.message, err.details), 400);
      }
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[invites.create] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to create invite'), 500);
    }
  })

  // Accept invite
  .post('/accept', authMiddleware, zValidator('json', invitesAcceptSchema), async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;
      const user = c.get('user')!;

      if (!user.email) {
        return c.json(error('UNAUTHORIZED', 'User email not available'), 401);
      }

      // Call service function with properly typed params
      const params: AcceptListInviteParams = {
        listId: input.listId,
        acceptingUserId: userId,
        token: input.token,
      };

      const result = await acceptListInvite(params);

      // Fetch updated invite for response
      const updatedInvite = await getInviteByListAndToken({
        listId: input.listId,
        token: input.token,
      });

      return c.json(success(updatedInvite), 200);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return c.json(error(err.code, err.message, err.details), 404);
      }
      if (err instanceof ValidationError) {
        return c.json(error(err.code, err.message, err.details), 400);
      }
      if (err instanceof ForbiddenError) {
        return c.json(error(err.code, err.message, err.details), 403);
      }
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[invites.accept] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to accept invite'), 500);
    }
  })

  // Decline invite
  .post('/decline', authMiddleware, zValidator('json', invitesDeclineSchema), async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      const invite = await getInviteByListAndToken({
        listId: input.listId,
        token: input.token,
      });

      if (!invite) {
        return c.json(error('NOT_FOUND', 'Invite not found'), 404);
      }

      if (invite.invitedUserId && invite.invitedUserId !== userId) {
        return c.json(error('FORBIDDEN', 'This invite belongs to a different user'), 403);
      }

      const deleted = await deleteInviteByListAndToken({
        listId: input.listId,
        token: input.token,
      });

      if (!deleted) {
        return c.json(error('NOT_FOUND', 'Invite not found'), 404);
      }

      return c.json(success({ success: true }), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[invites.decline] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to decline invite'), 500);
    }
  })

  // Delete invite
  .post('/delete', authMiddleware, zValidator('json', invitesDeleteSchema), async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      // Call service function with properly typed params
      const params: DeleteListInviteParams = {
        listId: input.listId,
        invitedUserEmail: input.invitedUserEmail,
        userId,
      };

      await deleteListInvite(params);

      return c.json(success({ success: true }), 200);
    } catch (err) {
      if (err instanceof ValidationError) {
        return c.json(error(err.code, err.message, err.details), 400);
      }
      if (err instanceof NotFoundError) {
        return c.json(error(err.code, err.message, err.details), 404);
      }
      if (err instanceof ForbiddenError) {
        return c.json(error(err.code, err.message, err.details), 403);
      }
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[invites.delete] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to delete invite'), 500);
    }
  });
