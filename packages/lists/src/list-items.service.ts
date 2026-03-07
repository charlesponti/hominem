import { db } from '@hominem/db';
import type { Selectable, Database } from '@hominem/db';

import type { ListPlace } from './contracts';
import { getListOwnedByUser } from './list-queries.service';

type TaskRow = Selectable<Database['tasks']>;

export interface ListTaskItem {
  id: string;
  listId: string | null;
  itemId: string;
  itemType: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListPlacePreview {
  itemId: string;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  photoUrl: string | null;
}

function taskToListItem(row: TaskRow): ListTaskItem {
  const createdAt = typeof row.created_at === 'string' ? row.created_at : new Date().toISOString();
  const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : createdAt;
  return {
    id: row.id,
    listId: row.list_id,
    itemId: row.id,
    itemType: 'TASK',
    createdAt,
    updatedAt,
  };
}

export async function getListPlaces(_listId: string): Promise<ListPlace[]> {
  return [];
}

export async function getPlaceListPreview(_listId: string): Promise<ListPlacePreview | null> {
  return null;
}

export async function getListPlacesMap(listIds: string[]): Promise<Map<string, ListPlace[]>> {
  const map = new Map<string, ListPlace[]>();
  for (const listId of listIds) {
    map.set(listId, []);
  }
  return map;
}

export async function deleteListItem(
  listId: string,
  itemId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .deleteFrom('tasks')
    .where((eb) =>
      eb.and([eb('id', '=', itemId), eb('list_id', '=', listId), eb('user_id', '=', userId)]),
    )
    .returningAll()
    .execute();

  return result.length > 0;
}

export async function addItemToList(params: {
  listId: string;
  itemId: string;
  itemType: 'FLIGHT' | 'PLACE';
  userId: string;
}): Promise<ListTaskItem> {
  const { listId, itemId, userId } = params;

  const listItem = await getListOwnedByUser(listId, userId);
  if (!listItem) {
    throw new Error("List not found or you don't have permission to add items to it");
  }

  const existing = await db
    .selectFrom('tasks')
    .selectAll()
    .where((eb) => eb.and([eb('id', '=', itemId), eb('user_id', '=', userId)]))
    .executeTakeFirst();

  if (existing) {
    const updated = await db
      .updateTable('tasks')
      .set({
        list_id: listId,
        updated_at: new Date().toISOString(),
      })
      .where((eb) => eb.and([eb('id', '=', itemId), eb('user_id', '=', userId)]))
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      throw new Error('Failed to attach item to list');
    }

    return taskToListItem(updated);
  }

  const inserted = await db
    .insertInto('tasks')
    .values({
      id: itemId,
      user_id: userId,
      title: 'Imported item',
      status: 'pending',
      priority: 'medium',
      list_id: listId,
    })
    .returningAll()
    .executeTakeFirst();

  if (!inserted) {
    throw new Error('Failed to add item to list');
  }

  return taskToListItem(inserted);
}

export async function removeItemFromList(params: {
  listId: string;
  itemId: string;
  userId: string;
}): Promise<boolean> {
  const { listId, itemId, userId } = params;

  const listItem = await getListOwnedByUser(listId, userId);
  if (!listItem) {
    throw new Error("List not found or you don't have permission to remove items from it");
  }

  const result = await db
    .updateTable('tasks')
    .set({
      list_id: null,
      updated_at: new Date().toISOString(),
    })
    .where((eb) =>
      eb.and([eb('id', '=', itemId), eb('list_id', '=', listId), eb('user_id', '=', userId)]),
    )
    .returningAll()
    .execute();

  return result.length > 0;
}

export async function getItemsByListId(listId: string): Promise<ListTaskItem[]> {
  const result = await db
    .selectFrom('tasks')
    .selectAll()
    .where('list_id', '=', listId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .execute();

  return result.map(taskToListItem);
}
