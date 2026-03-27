import { db } from '@hominem/db';

interface LinkRow {
  space_id: string;
  user_id: string;
}

export interface ListMembershipLink {
  listId: string;
  userId: string;
}

export async function isUserMemberOfList(listId: string, userId: string): Promise<boolean> {
  const result = await db
    .selectFrom('app.spaces')
    .select('id')
    .where((eb) => eb.and([eb('id', '=', listId), eb('owner_user_id', '=', userId)]))
    .union(
      db
        .selectFrom('app.space_members')
        .select('space_id as id')
        .where((eb) => eb.and([eb('space_id', '=', listId), eb('user_id', '=', userId)])),
    )
    .limit(1)
    .executeTakeFirst();

  return Boolean(result);
}

export async function getUserListLinks(listIds: string[]): Promise<ListMembershipLink[]> {
  if (listIds.length === 0) {
    return [];
  }

  const result = await db
    .selectFrom('app.spaces')
    .select(['id as space_id', 'owner_user_id as user_id'])
    .where('id', 'in', listIds)
    .union(
      db
        .selectFrom('app.space_members')
        .select(['space_id', 'user_id'])
        .where('space_id', 'in', listIds),
    )
    .orderBy('space_id', 'asc')
    .orderBy('user_id', 'asc')
    .execute();

  return (result as LinkRow[]).map((row) => ({
    listId: row.space_id,
    userId: row.user_id,
  }));
}

export async function removeUserFromList({
  listId,
  userIdToRemove,
  ownerId,
}: {
  listId: string;
  userIdToRemove: string;
  ownerId: string;
}) {
  const listRow = await db
    .selectFrom('app.spaces')
    .selectAll()
    .where('id', '=', listId)
    .executeTakeFirst();

  if (!listRow) {
    return { error: 'List not found.', status: 404 };
  }

  if (listRow.owner_user_id !== ownerId) {
    return { error: 'List not found or you do not own this list.', status: 403 };
  }

  if (userIdToRemove === ownerId) {
    return { error: 'Cannot remove the list owner.', status: 400 };
  }

  const removed = await db
    .deleteFrom('app.space_members')
    .where((eb) => eb.and([eb('space_id', '=', listId), eb('user_id', '=', userIdToRemove)]))
    .returningAll()
    .executeTakeFirst();

  if (!removed) {
    return { error: 'User is not a collaborator on this list.', status: 404 };
  }

  return { success: true };
}
