import { db, takeUniqueOrThrow } from '@hominem/db';
import {
  type ListInviteOutput,
  type ListOutput,
  type UserOutput,
  list,
  listInvite,
  userLists,
  users,
} from '@hominem/db/schema';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  InternalError,
  isServiceError,
} from '@hominem/services';
import { sendInviteEmail } from '@hominem/services/emails';
import { logger } from '@hominem/utils/logger';
import { and, eq, or } from 'drizzle-orm';
import crypto from 'node:crypto';
import { z } from 'zod';

/**
 * Input validation schema for sendListInvite
 */
export const sendListInviteSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  invitedUserEmail: z.string().email('Invalid email format'),
  invitingUserId: z.string().uuid('Invalid user ID'),
  baseUrl: z.string().url('Invalid base URL'),
});

export type SendListInviteParams = z.infer<typeof sendListInviteSchema>;

/**
 * Input validation schema for acceptListInvite
 */
export const acceptListInviteSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  acceptingUserId: z.string().uuid('Invalid user ID'),
  token: z.string().min(1, 'Token required'),
});

export type AcceptListInviteParams = z.infer<typeof acceptListInviteSchema>;

/**
 * Input validation schema for deleteListInvite
 */
export const deleteListInviteSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  invitedUserEmail: z.string().email('Invalid email format'),
  userId: z.string().uuid('Invalid user ID'),
});

export type DeleteListInviteParams = z.infer<typeof deleteListInviteSchema>;

/**
 * Gets all invites for a specific list
 * @param listId - The ID of the list
 * @returns Array of list invites with user data for accepted invites
 */
export async function getListInvites(
  listId: string,
): Promise<(ListInviteOutput & { list: ListOutput | null; user_invitedUserId: UserOutput | null })[]> {
  try {
    return await db.query.listInvite.findMany({
      where: eq(listInvite.listId, listId),
      with: {
        list: true,
        user_invitedUserId: true,
      },
    });
  } catch (error) {
    logger.error('Error fetching invites for list', {
      listId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Gets invites for a user by ID or email
 */
export async function getInvitesForUser(
  userId: string,
  normalizedEmail?: string | null,
): Promise<(ListInviteOutput & { list: ListOutput | null })[]> {
  const ownershipClause = normalizedEmail
    ? or(eq(listInvite.invitedUserId, userId), eq(listInvite.invitedUserEmail, normalizedEmail))
    : eq(listInvite.invitedUserId, userId);

  return db.query.listInvite.findMany({
    where: ownershipClause,
    with: { list: true },
  });
}

/**
 * Gets an invite by token, including associated list
 * @throws NotFoundError if invite not found
 */
export async function getInviteByToken(
  token: string,
): Promise<ListInviteOutput & { list: ListOutput | null }> {
  const invite = await db.query.listInvite.findFirst({
    where: eq(listInvite.token, token),
    with: { list: true },
  });

  if (!invite) {
    throw new NotFoundError('Invite', { token });
  }

  return invite;
}

/**
 * Gets an invite by list ID and token
 * @throws NotFoundError if invite not found
 */
export async function getInviteByListAndToken(params: {
  listId: string;
  token: string;
}): Promise<ListInviteOutput> {
  const { listId, token } = params;

  const invite = await db.query.listInvite.findFirst({
    where: and(eq(listInvite.listId, listId), eq(listInvite.token, token)),
  });

  if (!invite) {
    throw new NotFoundError('Invite', { listId, token });
  }

  return invite;
}

/**
 * Deletes an invite by list ID and token
 */
export async function deleteInviteByListAndToken(params: {
  listId: string;
  token: string;
}): Promise<boolean> {
  const { listId, token } = params;
  const deletedInvite = await db
    .delete(listInvite)
    .where(and(eq(listInvite.listId, listId), eq(listInvite.token, token)))
    .returning();

  return deletedInvite.length > 0;
}

/**
 * Gets all outbound invites sent by a user
 */
export async function getOutboundInvites(
  userId: string,
): Promise<(ListInviteOutput & { list: ListOutput; user_invitedUserId: UserOutput | null })[]> {
  return db.query.listInvite.findMany({
    where: eq(listInvite.userId, userId),
    with: {
      list: true,
      user_invitedUserId: true,
    },
  });
}

/**
 * Sends a new list invite to a user email
 *
 * @param params - Parameters including listId, invitedUserEmail, invitingUserId, baseUrl
 * @returns The created ListInviteOutput
 * @throws ValidationError if email format is invalid
 * @throws NotFoundError if list does not exist
 * @throws ConflictError if invite already exists for this email
 * @throws InternalError if database operation fails
 */
export async function sendListInvite(params: SendListInviteParams): Promise<ListInviteOutput> {
  const { listId, invitedUserEmail, invitingUserId, baseUrl } = params;

  const normalizedInvitedEmail = invitedUserEmail.toLowerCase();

  // Check if list exists
  const listRecord = await db.query.list.findFirst({
    where: eq(list.id, listId),
  });

  if (!listRecord) {
    throw new NotFoundError('ListOutput', { listId });
  }

  // Check if invite already exists
  const existingInvite = await db.query.listInvite.findFirst({
    where: and(
      eq(listInvite.listId, listId),
      eq(listInvite.invitedUserEmail, normalizedInvitedEmail),
    ),
  });

  if (existingInvite && !existingInvite.accepted) {
    throw new ConflictError('An invite for this email address to this list already exists', {
      listId,
      email: normalizedInvitedEmail,
    });
  }

  // Generate invite token
  const token = crypto.randomBytes(32).toString('hex');

  // Check if user exists with this email
  const invitedUserRecord = await db.query.users.findFirst({
    where: eq(users.email, normalizedInvitedEmail),
  });

  try {
    const createdInvite = await db
      .insert(listInvite)
      .values({
        listId,
        invitedUserEmail: normalizedInvitedEmail,
        invitedUserId: invitedUserRecord?.id || null,
        accepted: false,
        userId: invitingUserId,
        token,
      })
      .returning()
      .then(takeUniqueOrThrow);

    // Send invite email
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
      // Continue - invite was created even if email failed
    }

    return createdInvite;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('duplicate key value violates unique constraint')
    ) {
      throw new ConflictError('Invite already exists or conflicts with an existing record', {
        listId,
        email: normalizedInvitedEmail,
      });
    }

    throw new InternalError('Failed to create invite', {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Accepts a list invite
 *
 * @param params - Parameters including listId, acceptingUserId, token
 * @returns The list that was invited to
 * @throws NotFoundError if invite or list not found
 * @throws ValidationError if invite was already accepted or conditions not met
 * @throws InternalError if database operation fails
 */
export async function acceptListInvite(params: AcceptListInviteParams): Promise<ListOutput> {
  const { listId, acceptingUserId, token } = params;

  const invite = await db.query.listInvite.findFirst({
    where: and(eq(listInvite.listId, listId), eq(listInvite.token, token)),
  });

  if (!invite) {
    throw new NotFoundError('Invite', { listId, token });
  }

  if (invite.accepted) {
    throw new ValidationError('Invite already accepted', {
      listId,
      token,
    });
  }

  const listRecord = await db.query.list.findFirst({
    where: eq(list.id, invite.listId),
  });

  if (!listRecord) {
    throw new NotFoundError('ListOutput', { listId: invite.listId });
  }

  if (listRecord.userId === acceptingUserId) {
    throw new ValidationError('Cannot accept an invite to a list you own', {
      listId,
      acceptingUserId,
    });
  }

  const acceptingUser = await db.query.users.findFirst({
    where: eq(users.id, acceptingUserId),
  });

  if (!acceptingUser) {
    throw new NotFoundError('User', { userId: acceptingUserId });
  }

  try {
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

      const l = await tx.query.list.findFirst({
        where: eq(list.id, invite.listId),
      });

      if (!l) {
        throw new InternalError('ListOutput not found after accepting invite');
      }

      return l;
    });

    return acceptedList;
  } catch (error) {
    if (isServiceError(error)) {
      throw error;
    }

    throw new InternalError('Failed to accept invite', {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Deletes a pending invite (for list owner)
 *
 * @param params - Parameters including listId, invitedUserEmail, userId (owner)
 * @returns void (throws on error)
 * @throws ValidationError if invite was already accepted
 * @throws NotFoundError if list or invite not found
 * @throws ForbiddenError if user does not own the list
 * @throws InternalError if database operation fails
 */
export async function deleteListInvite(params: DeleteListInviteParams): Promise<void> {
  const { listId, invitedUserEmail, userId } = params;

  const normalizedEmail = invitedUserEmail.toLowerCase();

  // Ensure the requester owns the list
  const listRecord = await db.query.list.findFirst({
    where: and(eq(list.id, listId), eq(list.userId, userId)),
  });

  if (!listRecord) {
    throw new NotFoundError('ListOutput', { listId });
  }

  const invite = await db.query.listInvite.findFirst({
    where: and(eq(listInvite.listId, listId), eq(listInvite.invitedUserEmail, normalizedEmail)),
  });

  if (!invite) {
    throw new NotFoundError('Invite', { listId, email: normalizedEmail });
  }

  if (invite.accepted) {
    throw new ValidationError('Invite has already been accepted and cannot be deleted', {
      listId,
      email: normalizedEmail,
    });
  }

  try {
    await db
      .delete(listInvite)
      .where(and(eq(listInvite.listId, listId), eq(listInvite.invitedUserEmail, normalizedEmail)));
  } catch (error) {
    throw new InternalError('Failed to delete invite', {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}
