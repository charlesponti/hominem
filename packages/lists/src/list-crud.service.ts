import crypto from 'node:crypto';

import { db } from '@hominem/db';
import { sql } from '@hominem/db';

import type { ListOutput, ListPlace, ListUser, ListWithSpreadOwner } from './contracts';

interface TaskListRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string | null;
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

function toOutputRecord(row: TaskListRow): ListOutput {
  return {
    id: row.id,
    name: row.name,
    description: null,
    ownerId: row.user_id,
    isPublic: false,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.created_at ?? new Date().toISOString(),
    createdBy: null,
    places: [],
  };
}

export function formatList(
  listData: ListWithSpreadOwner,
  places: ListPlace[],
  isOwn: boolean,
  hasAccess?: boolean,
  collaborators?: ListUser[],
): ListOutput {
  return {
    id: listData.id,
    name: listData.name,
    description: listData.description || '',
    ownerId: listData.ownerId,
    createdBy: listData.owner
      ? {
          id: listData.owner.id,
          email: listData.owner.email,
          name: listData.owner.name || null,
        }
      : null,
    isOwnList: isOwn,
    hasAccess: hasAccess ?? isOwn,
    places: places || [],
    isPublic: listData.isPublic ?? false,
    users: collaborators,
    createdAt: listData.createdAt,
    updatedAt: listData.updatedAt,
  };
}

async function hasNameConflict(userId: string, name: string, excludeListId?: string): Promise<boolean> {
  const result = await db.execute(sql`
    select id
    from task_lists
    where user_id = ${userId}
      and name = ${name}
    limit 1
  `);
  const existing = resultRows<{ id: string }>(result)[0] ?? null;

  if (!existing) {
    return false;
  }

  if (excludeListId && existing.id === excludeListId) {
    return false;
  }

  return true;
}

export async function createList(name: string, userId: string): Promise<ListOutput | null> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return null;
  }

  const nameConflict = await hasNameConflict(userId, normalizedName);
  if (nameConflict) {
    return null;
  }

  const listId = crypto.randomUUID();
  await db.execute(sql`
    insert into task_lists (id, user_id, name)
    values (${listId}, ${userId}, ${normalizedName})
  `);

  const [created] = await db
    .execute(sql`
      select id, user_id, name, created_at
      from task_lists
      where id = ${listId}
      limit 1
    `)
    .then((res) => resultRows<TaskListRow>(res));

  if (!created) {
    return null;
  }

  return toOutputRecord(created);
}

export async function updateList(
  id: string,
  name: string,
  userId: string,
): Promise<ListOutput | null> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return null;
  }

  const owned = await db
    .execute(sql`
      select id
      from task_lists
      where id = ${id}
        and user_id = ${userId}
      limit 1
    `)
    .then((res) => resultRows<{ id: string }>(res)[0] ?? null);

  if (!owned) {
    return null;
  }

  const conflict = await hasNameConflict(userId, normalizedName, id);
  if (conflict) {
    return null;
  }

  await db.execute(sql`
    update task_lists
    set name = ${normalizedName}
    where id = ${id}
      and user_id = ${userId}
  `);

  const [updated] = await db
    .execute(sql`
      select id, user_id, name, created_at
      from task_lists
      where id = ${id}
      limit 1
    `)
    .then((res) => resultRows<TaskListRow>(res));

  if (!updated) {
    return null;
  }

  return toOutputRecord(updated);
}

export async function deleteList(id: string, userId: string): Promise<boolean> {
  const result = await db
    .execute(sql`
      delete from task_lists
      where id = ${id}
        and user_id = ${userId}
      returning id
    `)
    .then((res) => resultRows<{ id: string }>(res));

  return result.length > 0;
}
