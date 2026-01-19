import { db, takeUniqueOrThrow } from '@hominem/db';
import {
  type ListInviteSelect,
  type ListSelect,
  list,
  listInvite,
  userLists,
  users,
} from '@hominem/db/schema';
import { sendInviteEmail } from '@hominem/services/emails';
import { logger } from '@hominem/utils/logger';
import { and, eq, or } from 'drizzle-orm';
import crypto from 'node:crypto';

/**
 * Gets all invites for a specific list
 * @param listId - The ID of the list
 * @returns Array of list invites with user data for accepted invites
 */
export async function getListInvites(listId: string) {
  try {
    return await db.query.listInvite.findMany({
      where: eq(listInvite.listId, listId),
      with: {
        user_invitedUserId: true,
      },
    });
  } catch (error) {
    console.error(`Error fetching invites for list ${listId}:`, error);
    return [];
  }
}

export async function getInvitesForUser(userId: string, normalizedEmail?: string | null) {
  const ownershipClause = normalizedEmail
    ? or(eq(listInvite.invitedUserId, userId), eq(listInvite.invitedUserEmail, normalizedEmail))
    : eq(listInvite.invitedUserId, userId);

  return db.query.listInvite.findMany({
    where: ownershipClause,
    with: { list: true },
  });
}

export async function getInviteByToken(
  token: string,
): Promise<(ListInviteSelect & { list: ListSelect | null }) | undefined> {
  return db.query.listInvite.findFirst({
    where: eq(listInvite.token, token),
    with: { list: true },
  });
}

export async function getInviteByListAndToken(params: { listId: string; token: string }) {
  const { listId, token } = params;
  return db.query.listInvite.findFirst({
    where: and(eq(listInvite.listId, listId), eq(listInvite.token, token)),
  });
}

export async function deleteInviteByListAndToken(params: { listId: string; token: string }) {
  const { listId, token } = params;
  const deletedInvite = await db
    .delete(listInvite)
    .where(and(eq(listInvite.listId, listId), eq(listInvite.token, token)))
    .returning();

  return deletedInvite.length > 0;
}

export async function getOutboundInvites(userId: string) {
  return db.query.listInvite.findMany({
    where: eq(listInvite.userId, userId),
    with: { list: true },
  });
}

/**
 * Creates a new list invite.
 * @param listId - The ID of the list to invite to.
 * @param invitedUserEmail - The email of the user to invite.
 * @param invitingUserId - The ID of the user sending the invite.
 * @param baseUrl - The base URL for constructing the invite link.
 * @returns The created invite object or an error string.
 */
export async function sendListInvite(
  listId: string,
  invitedUserEmail: string,
  invitingUserId: string,
  baseUrl: string,
): Promise<ListInviteSelect | { error: string; status: number }> {
  try {
    const normalizedInvitedEmail = invitedUserEmail.toLowerCase();
    const listRecord = await db.query.list.findFirst({
      where: eq(list.id, listId),
    });

    if (!listRecord) {
      return { error: 'List not found', status: 404 };
    }

    const existingInvite = await db.query.listInvite.findFirst({
      where: and(
        eq(listInvite.listId, listId),
        eq(listInvite.invitedUserEmail, normalizedInvitedEmail),
      ),
    });

    if (existingInvite) {
      return {
        error: 'An invite for this email address to this list already exists.',
        status: 409,
      };
    }

    const token = crypto.randomBytes(32).toString('hex');

    const invitedUserRecord = await db.query.users.findFirst({
      where: eq(users.email, normalizedInvitedEmail),
    });

    const createdInvite = await db
      .insert(listInvite)
      .values({
        listId: listId,
        invitedUserEmail: normalizedInvitedEmail,
        invitedUserId: invitedUserRecord?.id || null,
        accepted: false,
        userId: invitingUserId,
        token,
      })
      .returning()
      .then(takeUniqueOrThrow);

    const inviteLink = `${baseUrl.replace(/\/$/, '')}/invites?token=${token}&listId=${listId}`;

    try {
      await sendInviteEmail({
        to: normalizedInvitedEmail,
        listName: listRecord.name,
        inviteLink,
      });
    } catch (error) {
      logger.error('Invite email failed to send', {
        listId,
        invitedUserEmail: normalizedInvitedEmail,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return createdInvite;
  } catch (error) {
    console.error(
      `Error creating list invite for list ${listId} by user ${invitingUserId}:`,
      error,
    );
    if (
      error instanceof Error &&
      error.message.includes('duplicate key value violates unique constraint')
    ) {
      return { error: 'Invite already exists or conflicts with an existing record.', status: 409 };
    }
    return { error: 'Failed to create invite.', status: 500 };
  }
}

/**
 * Accepts a list invite.
 * @param listId - The ID of the list from the invite.
 * @param acceptingUserId - The ID of the user accepting the invite.
 * @param token - The invite token used for verification.
 * @returns The list object if successful, or an error string.
 */
export async function acceptListInvite(listId: string, acceptingUserId: string, token: string) {
  try {
    const invite = await db.query.listInvite.findFirst({
      where: and(eq(listInvite.listId, listId), eq(listInvite.token, token)),
    });

    if (!invite) {
      return { error: 'Invite not found.', status: 404 };
    }

    if (invite.accepted) {
      return { error: 'Invite already accepted.', status: 400 };
    }

    const listRecord = await db.query.list.findFirst({
      where: eq(list.id, invite.listId),
    });

    if (!listRecord) {
      return { error: 'List not found.', status: 404 };
    }

    if (listRecord.userId === acceptingUserId) {
      return { error: 'Cannot accept an invite to a list you own.', status: 400 };
    }

    const acceptingUser = await db.query.users.findFirst({ where: eq(users.id, acceptingUserId) });
    if (!acceptingUser) {
      return { error: 'User account required to accept invite.', status: 404 };
    }

    const acceptedList = await db.transaction(async (tx) => {
      await tx
        .update(listInvite)
        .set({
          accepted: true,
          acceptedAt: new Date().toISOString(),
          invitedUserId: acceptingUserId,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(listInvite.listId, invite.listId), eq(listInvite.token, invite.token)));

      await tx
        .insert(userLists)
        .values({
          userId: acceptingUserId,
          listId: invite.listId,
        })
        .onConflictDoNothing();

      const l =
        listRecord ||
        (await tx.query.list.findFirst({
          where: eq(list.id, invite.listId),
        }));
      if (!l) {
        throw new Error('List not found after accepting invite.');
      }
      return l;
    });

    return acceptedList;
  } catch (error) {
    console.error(
      `Error accepting list invite for list ${listId} by user ${acceptingUserId}:`,
      error,
    );
    return { error: 'Failed to accept invite.', status: 500 };
  }
}

/**
 * Deletes a pending invite for a list owned by the requesting user.
 */
export async function deleteListInvite({
  listId,
  invitedUserEmail,
  userId,
}: {
  listId: string;
  invitedUserEmail: string;
  userId: string;
}) {
  try {
    const normalizedEmail = invitedUserEmail.toLowerCase();

    // Ensure the requester owns the list
    const listRecord = await db.query.list.findFirst({
      where: and(eq(list.id, listId), eq(list.userId, userId)),
    });

    if (!listRecord) {
      return { error: 'List not found or you do not own this list.', status: 403 };
    }

    const invite = await db.query.listInvite.findFirst({
      where: and(eq(listInvite.listId, listId), eq(listInvite.invitedUserEmail, normalizedEmail)),
    });

    if (!invite) {
      return { error: 'Invite not found.', status: 404 };
    }

    if (invite.accepted) {
      return { error: 'Invite has already been accepted and cannot be deleted.', status: 400 };
    }

    await db
      .delete(listInvite)
      .where(and(eq(listInvite.listId, listId), eq(listInvite.invitedUserEmail, normalizedEmail)));

    return { success: true };
  } catch (error) {
    console.error(
      `Error deleting list invite for list ${listId} by user ${userId} for ${invitedUserEmail}:`,
      error,
    );
    return { error: 'Failed to delete invite.', status: 500 };
  }
}
