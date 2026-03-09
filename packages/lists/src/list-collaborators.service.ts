import { db } from '@hominem/db';

interface LinkRow {
  list_id: string;
  user_id: string;
}

export interface ListMembershipLink {
  listId: string;
  userId: string;
}

export async function isUserMemberOfList(listId: string, userId: string): Promise<boolean> {
  const result = await db
    .selectFrom('task_lists as tl')
    .select('tl.id')
    .where((eb) => eb.and([eb('tl.id', '=', listId), eb('tl.user_id', '=', userId)]))
    .union(
      db
        .selectFrom('task_lists as tl')
        .innerJoin('task_list_collaborators as tlc', 'tlc.list_id', 'tl.id')
        .select('tl.id')
        .where((eb) => eb.and([eb('tl.id', '=', listId), eb('tlc.user_id', '=', userId)])),
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
    .selectFrom('task_lists as tl')
    .select(['tl.id as list_id', 'tl.user_id'])
    .where('tl.id', 'in', listIds)
    .union(
      db
        .selectFrom('task_list_collaborators as tlc')
        .select(['tlc.list_id', 'tlc.user_id'])
        .where('tlc.list_id', 'in', listIds),
    )
    .orderBy('list_id', 'asc')
    .orderBy('user_id', 'asc')
    .execute();

  return (result as LinkRow[]).map((row) => ({
    listId: row.list_id,
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
    .selectFrom('task_lists')
    .selectAll()
    .where('id', '=', listId)
    .executeTakeFirst();

  if (!listRow) {
    return { error: 'List not found.', status: 404 };
  }

  if (listRow.user_id !== ownerId) {
    return { error: 'List not found or you do not own this list.', status: 403 };
  }

  if (userIdToRemove === ownerId) {
    return { error: 'Cannot remove the list owner.', status: 400 };
  }

  const removed = await db
    .deleteFrom('task_list_collaborators')
    .where((eb) => eb.and([eb('list_id', '=', listId), eb('user_id', '=', userIdToRemove)]))
    .returningAll()
    .executeTakeFirst();

  if (!removed) {
    return { error: 'User is not a collaborator on this list.', status: 404 };
  }

  return { success: true };
}
