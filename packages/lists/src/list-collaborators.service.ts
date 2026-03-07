import { db } from '@hominem/db';
import { sql } from '@hominem/db';

interface MembershipRow {
  id: string;
}

interface LinkRow {
  list_id: string;
  user_id: string;
}

interface OwnedListRow {
  id: string;
  user_id: string;
}

export interface ListMembershipLink {
  listId: string;
  userId: string;
}

function resultRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      return rows as T[];
    }
  }
  return [];
}

export async function isUserMemberOfList(listId: string, userId: string): Promise<boolean> {
  const result = await db.execute(sql`
    select id from (
      select tl.id
      from task_lists tl
      where tl.id = ${listId}
        and tl.user_id = ${userId}
      union all
      select tl.id
      from task_lists tl
      join task_list_collaborators tlc on tlc.list_id = tl.id
      where tl.id = ${listId}
        and tlc.user_id = ${userId}
    ) membership
    limit 1
  `);

  return Boolean(resultRows<MembershipRow>(result)[0]);
}

export async function getUserListLinks(listIds: string[]): Promise<ListMembershipLink[]> {
  if (listIds.length === 0) {
    return [];
  }

  const listIdValues = sql.join(
    listIds.map((listId) => sql`${listId}`),
    sql`, `,
  );

  const result = await db.execute(sql`
    select list_id, user_id from (
      select tl.id as list_id, tl.user_id
      from task_lists tl
      where tl.id in (${listIdValues})
      union all
      select tlc.list_id, tlc.user_id
      from task_list_collaborators tlc
      where tlc.list_id in (${listIdValues})
    ) links
    order by list_id asc, user_id asc
  `);

  return resultRows<LinkRow>(result).map((row) => ({
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
  const listResult = await db.execute(sql`
    select id, user_id
    from task_lists
    where id = ${listId}
    limit 1
  `);

  const listRow = resultRows<OwnedListRow>(listResult)[0] ?? null;

  if (!listRow) {
    return { error: 'List not found.', status: 404 };
  }

  if (listRow.user_id !== ownerId) {
    return { error: 'List not found or you do not own this list.', status: 403 };
  }

  if (userIdToRemove === ownerId) {
    return { error: 'Cannot remove the list owner.', status: 400 };
  }

  const removedResult = await db.execute(sql`
    delete from task_list_collaborators
    where list_id = ${listId}
      and user_id = ${userIdToRemove}
    returning list_id
  `);

  const removed = resultRows<{ list_id: string }>(removedResult)[0] ?? null;
  if (!removed) {
    return { error: 'User is not a collaborator on this list.', status: 404 };
  }

  return { success: true };
}
