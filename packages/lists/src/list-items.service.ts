import { db } from '@hominem/db';
import { sql } from '@hominem/db';

import type { ListPlace } from './contracts';
import { getListOwnedByUser } from './list-queries.service';

interface DeletedRow {
  id: string;
}

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  completed_at: string | null;
  parent_id: string | null;
  list_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

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

function taskToListItem(row: TaskRow): ListTaskItem {
  const createdAt = row.created_at ?? new Date().toISOString();
  const updatedAt = row.updated_at ?? createdAt;
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
  const result = await db.execute(sql`
    delete from tasks
    where id = ${itemId}
      and list_id = ${listId}
      and user_id = ${userId}
    returning id
  `);

  return resultRows<DeletedRow>(result).length > 0;
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

  const existingResult = await db.execute(sql`
    select
      id,
      user_id,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      parent_id,
      list_id,
      created_at,
      updated_at
    from tasks
    where id = ${itemId}
      and user_id = ${userId}
    limit 1
  `);

  const existing = resultRows<TaskRow>(existingResult)[0] ?? null;
  if (existing) {
    const updatedResult = await db.execute(sql`
      update tasks
      set list_id = ${listId}, updated_at = now()
      where id = ${itemId}
        and user_id = ${userId}
      returning
        id,
        user_id,
        title,
        description,
        status,
        priority,
        due_date,
        completed_at,
        parent_id,
        list_id,
        created_at,
        updated_at
    `);

    const updated = resultRows<TaskRow>(updatedResult)[0] ?? null;
    if (!updated) {
      throw new Error('Failed to attach item to list');
    }

    return taskToListItem(updated);
  }

  const insertedResult = await db.execute(sql`
    insert into tasks (id, user_id, title, status, priority, list_id)
    values (${itemId}, ${userId}, 'Imported item', 'pending', 'medium', ${listId})
    returning
      id,
      user_id,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      parent_id,
      list_id,
      created_at,
      updated_at
  `);

  const inserted = resultRows<TaskRow>(insertedResult)[0] ?? null;
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

  const result = await db.execute(sql`
    update tasks
    set list_id = null, updated_at = now()
    where id = ${itemId}
      and list_id = ${listId}
      and user_id = ${userId}
    returning id
  `);

  return resultRows<DeletedRow>(result).length > 0;
}

export async function getItemsByListId(listId: string): Promise<ListTaskItem[]> {
  const result = await db.execute(sql`
    select
      id,
      user_id,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      parent_id,
      list_id,
      created_at,
      updated_at
    from tasks
    where list_id = ${listId}
    order by created_at desc, id asc
  `);

  return resultRows<TaskRow>(result).map(taskToListItem);
}
