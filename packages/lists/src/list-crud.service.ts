import crypto from 'node:crypto';

import { db } from '@hominem/db';

import type { ListOutput, ListPlace, ListUser, ListWithSpreadOwner } from './contracts';

type TaskListRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string | null;
};

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

async function hasNameConflict(
  userId: string,
  name: string,
  excludeListId?: string,
): Promise<boolean> {
  const existing = await db
    .selectFrom('task_lists')
    .select('id')
    .where((eb) => eb.and([eb('user_id', '=', userId), eb('name', '=', name)]))
    .executeTakeFirst();

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
  await db
    .insertInto('task_lists')
    .values({
      id: listId,
      user_id: userId,
      name: normalizedName,
    })
    .execute();

  const created = await db
    .selectFrom('task_lists')
    .select(['id', 'user_id', 'name', 'created_at'])
    .where('id', '=', listId)
    .executeTakeFirst();

  if (!created) {
    return null;
  }

  return toOutputRecord(created as TaskListRow);
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
    .selectFrom('task_lists')
    .select('id')
    .where((eb) => eb.and([eb('id', '=', id), eb('user_id', '=', userId)]))
    .executeTakeFirst();

  if (!owned) {
    return null;
  }

  const conflict = await hasNameConflict(userId, normalizedName, id);
  if (conflict) {
    return null;
  }

  await db
    .updateTable('task_lists')
    .set({
      name: normalizedName,
    })
    .where((eb) => eb.and([eb('id', '=', id), eb('user_id', '=', userId)]))
    .execute();

  const updated = await db
    .selectFrom('task_lists')
    .select(['id', 'user_id', 'name', 'created_at'])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!updated) {
    return null;
  }

  return toOutputRecord(updated as TaskListRow);
}

export async function deleteList(id: string, userId: string): Promise<boolean> {
  const result = await db
    .deleteFrom('task_lists')
    .where((eb) => eb.and([eb('id', '=', id), eb('user_id', '=', userId)]))
    .returningAll()
    .execute();

  return result.length > 0;
}
