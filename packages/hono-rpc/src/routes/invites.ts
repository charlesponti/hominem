import { UserAuthService } from '@hominem/auth/server';
import {
  acceptListInvite,
  deleteInviteByListAndToken,
  deleteListInvite,
  getInviteByListAndToken,
  getInviteByToken,
  getInvitesForUser,
  getPlaceListPreview,
  getListInvites,
  getOutboundInvites,
  isUserMemberOfList,
  sendListInvite,
  type SendListInviteParams,
  type AcceptListInviteParams,
  type DeleteListInviteParams,
} from '@hominem/lists-services';
import { getListOwnedByUser } from '@hominem/lists-services';
import { getPlacePhotoById } from '@hominem/places-services';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  InternalError,
} from '@hominem/services';
import { getHominemPhotoURL } from '@hominem/utils/images';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';
import {
  invitesGetReceivedSchema,
  invitesGetByListSchema,
  invitesCreateSchema,
  invitesAcceptSchema,
  invitesDeclineSchema,
  invitesDeleteSchema,
  invitesPreviewSchema,
  type Invite,
  type InvitesGetReceivedOutput,
  type InvitesGetSentOutput,
  type InvitesGetByListOutput,
  type InvitesCreateOutput,
  type InvitesAcceptOutput,
  type InvitesDeclineOutput,
  type InvitesDeleteOutput,
  type InvitesPreviewOutput,
} from '../types/invites.types';

/**
 * Transform database invite to API contract format
 *
 * Database schema uses 'userId' for inviting user and 'isAccepted' boolean,
 * but API contract uses 'invitingUserId' and 'status' enum.
 */
function transformInviteToApiFormat(dbInvite: any): Invite {
  return {
    id: dbInvite.token, // Use token as id since DB doesn't have separate id
    listId: dbInvite.listId,
    invitingUserId: dbInvite.userId, // Map userId -> invitingUserId
    invitedUserId: dbInvite.invitedUserId,
    invitedUserEmail: dbInvite.invitedUserEmail,
    token: dbInvite.token,
    status: dbInvite.isAccepted ? 'accepted' : dbInvite.acceptedAt ? 'declined' : 'pending', // Map boolean -> enum
    createdAt: dbInvite.createdAt,
    updatedAt: dbInvite.updatedAt,
    ...(dbInvite.list && { list: dbInvite.list }),
    ...(dbInvite.user_invitedUserId && {
      invitingUser: {
        id: dbInvite.user_invitedUserId.id,
        email: dbInvite.user_invitedUserId.email,
        name: dbInvite.user_invitedUserId.name,
      }
    }),
  };
}

// ============================================================================
// Routes
// ============================================================================

export const invitesRoutes = new Hono<AppContext>()
  // Invite preview (public)
  .post('/preview', publicMiddleware, zValidator('json', invitesPreviewSchema), async (c) => {
    const input = c.req.valid('json');
    const invite = await getInviteByToken(input.token);

    if (!invite) {
      return c.json<InvitesPreviewOutput>(null, 200);
    }

    const list = invite.list;
    let coverPhoto: string | null | undefined;
    let firstItemName: string | null | undefined;

    if (list?.id) {
      const firstPlace = await getPlaceListPreview(list.id);

      if (firstPlace) {
        firstItemName = firstPlace.name ?? firstPlace.description ?? null;

        // Prefer server-provided resolved photo URL when available
        coverPhoto = (firstPlace as { photoUrl?: string }).photoUrl ?? firstPlace.imageUrl;

        // Fall back to fetching by place photo id and resolve on the server
        if (!coverPhoto && firstPlace.itemId) {
          const rawPhoto = await getPlacePhotoById(firstPlace.itemId);
          coverPhoto = rawPhoto ? getHominemPhotoURL(rawPhoto, 600, 400) : null;
        }
      }
    }

    return c.json<InvitesPreviewOutput>(
      {
        listId: list?.id ?? invite.listId,
        listName: list?.name ?? invite.list?.name ?? 'Shared list',
        coverPhoto: coverPhoto || undefined,
        firstItemName,
        invitedUserEmail: invite.invitedUserEmail,
      },
      200,
    );
  })
  // Get received invites (no service call - query operation)
  .post('/received', authMiddleware, zValidator('json', invitesGetReceivedSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const user = c.get('user')!;

    const normalizedEmail = user.email?.toLowerCase();
    const tokenFilter = input.token;

    const baseInvites = await getInvitesForUser(userId, normalizedEmail);

    const filteredBaseInvites = baseInvites
      .filter((invite: any) => invite.list?.ownerId !== userId)
      .map((invite: any) => ({ ...invite, belongsToAnotherUser: false }));

    let tokenInvite: ((typeof baseInvites)[number] & { belongsToAnotherUser: boolean }) | undefined;

    if (tokenFilter) {
      const inviteByToken = await getInviteByToken(tokenFilter);
      if (inviteByToken) {
        const inviteList = inviteByToken.list;
        if (inviteList && inviteList.ownerId !== userId) {
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

    return c.json<InvitesGetReceivedOutput>(invites.map(transformInviteToApiFormat), 200);
  })

  // Get sent invites
  .post('/sent', authMiddleware, async (c) => {
    const userId = c.get('userId')!;

    const invites = await getOutboundInvites(userId);

    return c.json<InvitesGetSentOutput>(invites.map(transformInviteToApiFormat), 200);
  })

  // Get invites by list
  .post('/by-list', authMiddleware, zValidator('json', invitesGetByListSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const listItem = await getListOwnedByUser(input.listId, userId);
    if (!listItem) {
      throw new ForbiddenError("You don't have permission to access this list's invites");
    }

    const invites = await getListInvites(input.listId);

    return c.json<InvitesGetByListOutput>(invites.map(transformInviteToApiFormat), 200);
  })

  // Create invite
  .post('/create', authMiddleware, zValidator('json', invitesCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const user = c.get('user')!;

    const normalizedEmail = input.invitedUserEmail.toLowerCase();

    // Prevent self-invites
    if (normalizedEmail === user.email?.toLowerCase()) {
      throw new ValidationError('You cannot invite yourself to a list');
    }

    // Check if user owns the list
    const listItem = await getListOwnedByUser(input.listId, userId);
    if (!listItem) {
      throw new ForbiddenError("You don't have permission to invite users to this list");
    }

    // Check if the invited user is already a member
    const invitedUser = await UserAuthService.getUserByEmail(normalizedEmail);
    if (invitedUser) {
      const isAlreadyMember = await isUserMemberOfList(input.listId, invitedUser.id);
      if (isAlreadyMember) {
        throw new ConflictError('This user is already a member of this list');
      }
    }

    const baseUrl = process.env.VITE_APP_BASE_URL;
    if (!baseUrl) {
      throw new InternalError('Server configuration error');
    }

    // Call service function with properly typed params
    const params: SendListInviteParams = {
      listId: input.listId,
      invitedUserEmail: normalizedEmail,
      invitingUserId: userId,
      baseUrl,
    };

    const result = await sendListInvite(params);

    return c.json<InvitesCreateOutput>(transformInviteToApiFormat(result), 201);
  })

  // Accept invite
  .post('/accept', authMiddleware, zValidator('json', invitesAcceptSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const user = c.get('user')!;

    if (!user.email) {
      throw new UnauthorizedError('User email not available');
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

    return c.json<InvitesAcceptOutput>(transformInviteToApiFormat(updatedInvite), 200);
  })

  // Decline invite
  .post('/decline', authMiddleware, zValidator('json', invitesDeclineSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const invite = await getInviteByListAndToken({
      listId: input.listId,
      token: input.token,
    });

    if (!invite) {
      throw new NotFoundError('Invite not found');
    }

    if (invite.invitedUserId && invite.invitedUserId !== userId) {
      throw new ForbiddenError('This invite belongs to a different user');
    }

    const deleted = await deleteInviteByListAndToken({
      listId: input.listId,
      token: input.token,
    });

    if (!deleted) {
      throw new NotFoundError('Invite not found');
    }

    return c.json<InvitesDeclineOutput>({ success: true }, 200);
  })

  // Delete invite
  .post('/delete', authMiddleware, zValidator('json', invitesDeleteSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    // Call service function with properly typed params
    const params: DeleteListInviteParams = {
      listId: input.listId,
      invitedUserEmail: input.invitedUserEmail,
      userId,
    };

    await deleteListInvite(params);

    return c.json<InvitesDeleteOutput>({ success: true }, 200);
  });
