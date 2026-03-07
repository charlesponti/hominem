import { db } from '@hominem/db';
import { sql } from '@hominem/db';

import type { ListOutput, ListRecord, ListWithSpreadOwner } from './contracts';
import { formatList } from './list-crud.service';

interface ListProjectionRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string | null;
  owner_email: string | null;
  owner_name: string | null;
  task_count?: number | null;
}

interface OwnedListRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string | null;
}

interface PlaceListRow {
  id: string;
  name: string;
  item_count: number;
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

function toListWithOwner(row: ListProjectionRow): ListWithSpreadOwner {
  const createdAt = row.created_at ?? new Date().toISOString();
  const output: ListWithSpreadOwner = {
    id: row.id,
    name: row.name,
    description: null,
    ownerId: row.owner_id,
    isPublic: false,
    createdAt,
    updatedAt: createdAt,
    owner: row.owner_email
      ? {
          id: row.owner_id,
          email: row.owner_email,
          name: row.owner_name,
        }
      : null,
  };

  if (row.task_count !== undefined && row.task_count !== null) {
    output.itemCount = Number(row.task_count);
  }

  return output;
}

async function queryOwnedListRows(
  userId: string,
  withCount: boolean,
): Promise<ListProjectionRow[]> {
  if (withCount) {
    const result = await db.execute(sql`
      select
        tl.id,
        tl.name,
        tl.user_id as owner_id,
        tl.created_at,
        u.email as owner_email,
        u.name as owner_name,
        count(t.id)::int as task_count
      from task_lists tl
      join users u on u.id = tl.user_id
      left join tasks t on t.list_id = tl.id and t.user_id = tl.user_id
      where tl.user_id = ${userId}
      group by tl.id, tl.name, tl.user_id, tl.created_at, u.email, u.name
      order by tl.created_at desc, tl.id asc
    `);
    return resultRows<ListProjectionRow>(result);
  }

  const result = await db.execute(sql`
    select
      tl.id,
      tl.name,
      tl.user_id as owner_id,
      tl.created_at,
      u.email as owner_email,
      u.name as owner_name
    from task_lists tl
    join users u on u.id = tl.user_id
    where tl.user_id = ${userId}
    order by tl.created_at desc, tl.id asc
  `);

  return resultRows<ListProjectionRow>(result);
}

async function queryAccessibleListRows(
  userId: string,
  withCount: boolean,
): Promise<ListProjectionRow[]> {
  if (withCount) {
    const result = await db.execute(sql`
      select
        tl.id,
        tl.name,
        tl.user_id as owner_id,
        tl.created_at,
        u.email as owner_email,
        u.name as owner_name,
        count(t.id)::int as task_count
      from task_lists tl
      join users u on u.id = tl.user_id
      left join tasks t on t.list_id = tl.id and t.user_id = tl.user_id
      where tl.user_id = ${userId}
         or exists (
            select 1
            from task_list_collaborators tlc
            where tlc.list_id = tl.id
              and tlc.user_id = ${userId}
          )
      group by tl.id, tl.name, tl.user_id, tl.created_at, u.email, u.name
      order by tl.created_at desc, tl.id asc
    `);
    return resultRows<ListProjectionRow>(result);
  }

  const result = await db.execute(sql`
    select
      tl.id,
      tl.name,
      tl.user_id as owner_id,
      tl.created_at,
      u.email as owner_email,
      u.name as owner_name
    from task_lists tl
    join users u on u.id = tl.user_id
    where tl.user_id = ${userId}
       or exists (
          select 1
          from task_list_collaborators tlc
          where tlc.list_id = tl.id
            and tlc.user_id = ${userId}
        )
    order by tl.created_at desc, tl.id asc
  `);
  return resultRows<ListProjectionRow>(result);
}

export async function getUserLists(userId: string): Promise<ListWithSpreadOwner[]> {
  const rows = await queryAccessibleListRows(userId, false);
  return rows.map(toListWithOwner);
}

export async function getUserListsWithItemCount(
  userId: string,
  _itemType?: string,
): Promise<ListWithSpreadOwner[]> {
  const rows = await queryAccessibleListRows(userId, true);
  return rows.map(toListWithOwner);
}

export async function getOwnedLists(userId: string): Promise<ListWithSpreadOwner[]> {
  const rows = await queryOwnedListRows(userId, false);
  return rows.map(toListWithOwner);
}

export async function getOwnedListsWithItemCount(
  userId: string,
  _itemType?: string,
): Promise<ListWithSpreadOwner[]> {
  const rows = await queryOwnedListRows(userId, true);
  return rows.map(toListWithOwner);
}

export async function getAllUserListsWithPlaces(userId: string): Promise<{
  ownedListsWithPlaces: ListOutput[];
  sharedListsWithPlaces: ListOutput[];
}> {
  const all = await getUserListsWithItemCount(userId);
  const owned = all.filter((row) => row.ownerId === userId);
  const shared = all.filter((row) => row.ownerId !== userId);
  return {
    ownedListsWithPlaces: owned.map((row) => formatList(row, [], true, true)),
    sharedListsWithPlaces: shared.map((row) => formatList(row, [], false, true)),
  };
}

export async function getListById(id: string, userId?: string | null): Promise<ListOutput | null> {
  if (!userId) {
    return null;
  }

  const result = await db.execute(sql`
    select
      tl.id,
      tl.name,
      tl.user_id as owner_id,
      tl.created_at,
      u.email as owner_email,
      u.name as owner_name
    from task_lists tl
    join users u on u.id = tl.user_id
    where tl.id = ${id}
      and (
        tl.user_id = ${userId}
        or exists (
          select 1
          from task_list_collaborators tlc
          where tlc.list_id = tl.id
            and tlc.user_id = ${userId}
        )
      )
    limit 1
  `);

  const row = resultRows<ListProjectionRow>(result)[0] ?? null;
  if (!row) {
    return null;
  }

  return formatList(toListWithOwner(row), [], true, true);
}

export async function getListOwnedByUser(
  listId: string,
  userId: string,
): Promise<ListRecord | undefined> {
  const result = await db.execute(sql`
    select
      tl.id,
      tl.name,
      tl.user_id as owner_id,
      tl.created_at
    from task_lists tl
    where tl.id = ${listId}
      and tl.user_id = ${userId}
    limit 1
  `);

  const row = resultRows<OwnedListRow>(result)[0] ?? null;
  if (!row) {
    return undefined;
  }

  const createdAt = row.created_at ?? new Date().toISOString();
  return {
    id: row.id,
    name: row.name,
    description: null,
    ownerId: row.owner_id,
    isPublic: false,
    createdAt,
    updatedAt: createdAt,
  };
}

export async function getPlaceLists(params: {
  userId: string;
  placeId?: string;
  googleMapsId?: string;
}): Promise<Array<{ id: string; name: string; itemCount: number; imageUrl: string | null }>> {
  if (!(params.placeId || params.googleMapsId)) {
    return [];
  }

  const placeKey = params.placeId ?? params.googleMapsId ?? '';
  if (!placeKey) {
    return [];
  }

  const result = await db.execute(sql`
    select
      tl.id,
      tl.name,
      count(t.id)::int as item_count
    from task_lists tl
    join tasks t on t.list_id = tl.id and t.user_id = tl.user_id
    where tl.user_id = ${params.userId}
      and lower(t.title) like ${`%${placeKey.toLowerCase()}%`}
    group by tl.id, tl.name
    order by item_count desc, tl.created_at desc, tl.id asc
  `);

  return resultRows<PlaceListRow>(result).map((row) => ({
    id: row.id,
    name: row.name,
    itemCount: Number(row.item_count),
    imageUrl: null,
  }));
}
