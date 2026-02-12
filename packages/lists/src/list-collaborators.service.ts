import type { UserListsOutput } from '@hominem/db/types/lists';

import { db } from '@hominem/db';
import { and, eq, inArray } from '@hominem/db';
import { list } from '@hominem/db/schema/lists';
import { listInvite, userLists } from '@hominem/db/schema/lists';

export async function isUserMemberOfList(listId: string, userId: string): Promise<boolean> {
  const membership = await db.query.userLists.findFirst({
    where: and(eq(userLists.listId, listId), eq(userLists.userId, userId)),
  });
  return Boolean(membership);
}

export async function getUserListLinks(listIds: string[]): Promise<UserListsOutput[]> {
  return db.query.userLists.findMany({
    where: inArray(userLists.listId, listIds),
  });
}

/**
 * Remove a user from a list (remove their collaboration access)
 * @param listId - The ID of the list
 * @param userIdToRemove - The ID of the user to remove from the list
 * @param ownerId - The ID of the list owner (requester)
 * @returns Object with success status or error message
 */
export async function removeUserFromList({
  listId,
  userIdToRemove,
  ownerId,
}: {
  listId: string;
  userIdToRemove: string;
  ownerId: string;
}) {
  try {
    // Ensure the requester owns the list
    const listRecord = await db.query.list.findFirst({
      where: and(eq(list.id, listId), eq(list.ownerId, ownerId)),
    });

    if (!listRecord) {
      return {
        error: 'ListOutput not found or you do not own this list.',
        status: 403,
      };
    }

    // Prevent removing the owner
    if (userIdToRemove === ownerId) {
      return { error: 'Cannot remove the list owner.', status: 400 };
    }

    // Check if the user is actually a collaborator (has user_lists record)
    const userListRecord = await db.query.userLists.findFirst({
      where: and(eq(userLists.listId, listId), eq(userLists.userId, userIdToRemove)),
    });

    // Check if there's an accepted invite for this user (even if no user_lists record exists)
    const acceptedInvite = await db.query.listInvite.findFirst({
      where: and(
        eq(listInvite.listId, listId),
        eq(listInvite.invitedUserId, userIdToRemove),
        eq(listInvite.isAccepted, true),
      ),
    });

    // If neither exists, the user is not a collaborator
    if (!(userListRecord || acceptedInvite)) {
      return { error: 'User is not a collaborator on this list.', status: 404 };
    }

    // Remove the user from the list (if user_lists record exists)
    if (userListRecord) {
      await db
        .delete(userLists)
        .where(and(eq(userLists.listId, listId), eq(userLists.userId, userIdToRemove)));
    }

    // Also delete or update the accepted invite if it exists
    // This handles the edge case where invite is accepted but user_lists wasn't created
    if (acceptedInvite) {
      await db
        .delete(listInvite)
        .where(
          and(
            eq(listInvite.listId, listId),
            eq(listInvite.invitedUserId, userIdToRemove),
            eq(listInvite.isAccepted, true),
          ),
        );
    }

    return { success: true };
  } catch (error) {
    console.error(
      `Error removing user ${userIdToRemove} from list ${listId} by owner ${ownerId}:`,
      error,
    );
    return { error: 'Failed to remove user from list.', status: 500 };
  }
}
