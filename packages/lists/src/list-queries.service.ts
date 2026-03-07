import { sql, type AliasedExpression } from 'kysely';

import { db } from '@hominem/db';

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
    const result = await db
      .selectFrom('task_lists as tl')
      .innerJoin('users as u', 'u.id', 'tl.user_id')
      .leftJoin('tasks as t', (join) =>
        join
          .onRef('t.list_id', '=', 'tl.id')
          .onRef('t.user_id', '=', 'tl.user_id'),
      )
      .select([
        'tl.id',
        'tl.name',
        sql<string>`tl.user_id`.as('owner_id'),
        'tl.created_at',
        sql<string>`u.email`.as('owner_email'),
        sql<string>`u.name`.as('owner_name'),
        sql<number>`count(t.id)::int`.as('task_count'),
      ])
      .where('tl.user_id', '=', userId)
      .groupBy(['tl.id', 'tl.name', 'tl.user_id', 'tl.created_at', 'u.email', 'u.name'])
      .orderBy('tl.created_at', 'desc')
      .orderBy('tl.id', 'asc')
      .execute();

    return result as unknown as ListProjectionRow[];
  }

  const result = await db
    .selectFrom('task_lists as tl')
    .innerJoin('users as u', 'u.id', 'tl.user_id')
    .select([
      'tl.id',
      'tl.name',
      sql<string>`tl.user_id`.as('owner_id'),
      'tl.created_at',
      sql<string>`u.email`.as('owner_email'),
      sql<string>`u.name`.as('owner_name'),
    ])
    .where('tl.user_id', '=', userId)
    .orderBy('tl.created_at', 'desc')
    .orderBy('tl.id', 'asc')
    .execute();

  return result as ListProjectionRow[];
}

async function queryAccessibleListRows(
  userId: string,
  withCount: boolean,
): Promise<ListProjectionRow[]> {
  if (withCount) {
    const result = await db
      .selectFrom('task_lists as tl')
      .innerJoin('users as u', 'u.id', 'tl.user_id')
      .leftJoin('tasks as t', (join) =>
        join
          .onRef('t.list_id', '=', 'tl.id')
          .onRef('t.user_id', '=', 'tl.user_id'),
      )
      .select([
        'tl.id',
        'tl.name',
        sql<string>`tl.user_id`.as('owner_id'),
        'tl.created_at',
        sql<string>`u.email`.as('owner_email'),
        sql<string>`u.name`.as('owner_name'),
        sql<number>`count(t.id)::int`.as('task_count'),
      ])
      .where((eb) =>
        eb.or([
          eb('tl.user_id', '=', userId),
          eb.exists(
            db
              .selectFrom('task_list_collaborators as tlc')
              .select(['tlc.id'] as any)
              .where((qb) => qb('tlc.user_id', '=', userId))
              .where(sql`tlc.list_id = tl.id` as any),
          ),
        ]),
      )
      .groupBy(['tl.id', 'tl.name', 'tl.user_id', 'tl.created_at', 'u.email', 'u.name'])
      .orderBy('tl.created_at', 'desc')
      .orderBy('tl.id', 'asc')
      .execute();

    return result as unknown as ListProjectionRow[];
  }

  const result = await db
    .selectFrom('task_lists as tl')
    .innerJoin('users as u', 'u.id', 'tl.user_id')
    .select([
      'tl.id',
      'tl.name',
      sql<string>`tl.user_id`.as('owner_id'),
      'tl.created_at',
      sql<string>`u.email`.as('owner_email'),
      sql<string>`u.name`.as('owner_name'),
    ])
    .where((eb) =>
      eb.or([
        eb('tl.user_id', '=', userId),
        eb.exists(
          db
            .selectFrom('task_list_collaborators as tlc')
            .select(['tlc.id'] as any)
            .where(sql`tlc.list_id = tl.id AND tlc.user_id = ${userId}` as any),
        ),
      ]),
    )
    .orderBy('tl.created_at', 'desc')
    .orderBy('tl.id', 'asc')
    .execute();

  return result as ListProjectionRow[];
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

  const row = await db
    .selectFrom('task_lists as tl')
    .innerJoin('users as u', 'u.id', 'tl.user_id')
    .select([
      'tl.id',
      'tl.name',
      sql<string>`tl.user_id`.as('owner_id'),
      'tl.created_at',
      sql<string>`u.email`.as('owner_email'),
      sql<string>`u.name`.as('owner_name'),
    ])
    .where((eb) =>
      eb.and([
        eb('tl.id', '=', id),
        eb.or([
          eb('tl.user_id', '=', userId),
          eb.exists(
            db
              .selectFrom('task_list_collaborators as tlc')
              .select(['tlc.id'] as any)
              .where((qb) => qb('tlc.user_id', '=', userId))
              .where(sql`tlc.list_id = tl.id` as any),
          ),
        ]),
      ]),
    )
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return formatList(toListWithOwner(row as ListProjectionRow), [], true, true);
}

export async function getListOwnedByUser(
  listId: string,
  userId: string,
): Promise<ListRecord | undefined> {
  const row = await db
    .selectFrom('task_lists as tl')
    .select([
      'tl.id',
      'tl.name',
      sql<string>`tl.user_id`.as('owner_id'),
      'tl.created_at',
    ])
    .where((eb) =>
      eb.and([
        eb('tl.id', '=', listId),
        eb('tl.user_id', '=', userId),
      ]),
    )
    .executeTakeFirst();

  if (!row) {
    return undefined;
  }

  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at ?? new Date().toISOString());
  return {
    id: row.id,
    name: row.name,
    description: null,
    ownerId: row.owner_id as string,
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

  const result = await db
    .selectFrom('task_lists as tl')
    .innerJoin('tasks as t', (join) =>
      join
        .onRef('t.list_id', '=', 'tl.id')
        .onRef('t.user_id', '=', 'tl.user_id'),
    )
    .select([
      'tl.id',
      'tl.name',
      sql<number>`count(t.id)::int`.as('item_count'),
    ])
    .where((eb) =>
      eb.and([
        eb('tl.user_id', '=', params.userId),
        eb(sql`lower(t.title)`, 'like', `%${placeKey.toLowerCase()}%`),
      ]),
    )
    .groupBy(['tl.id', 'tl.name'])
    .orderBy(sql`item_count`, 'desc')
    .orderBy('tl.created_at', 'desc')
    .orderBy('tl.id', 'asc')
    .execute();

  return (result as PlaceListRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    itemCount: Number(row.item_count),
    imageUrl: null,
  }));
}
