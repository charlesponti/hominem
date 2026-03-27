import { db } from '@hominem/db';

import type { ListOutput, ListRecord, ListWithSpreadOwner } from './contracts';
import { formatList } from './list-crud.service';

type ListProjectionRow = {
  id: string;
  name: string;
  owner_id: string;
  created_at: Date | string;
  owner_email: string;
  owner_name: string | null;
  task_count?: number | null;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toListWithOwner(row: ListProjectionRow): ListWithSpreadOwner {
  const createdAt = toIso(row.created_at);

  const output: ListWithSpreadOwner = {
    id: row.id,
    name: row.name,
    description: null,
    ownerId: row.owner_id,
    isPublic: false,
    createdAt,
    updatedAt: createdAt,
    owner: {
      id: row.owner_id,
      email: row.owner_email,
      name: row.owner_name,
    },
  };

  if (row.task_count !== undefined && row.task_count !== null) {
    output.itemCount = Number(row.task_count);
  }

  return output;
}

// NOTE: We intentionally keep this implementation small and type-stable.
// Space list querying is currently unblocked elsewhere; we return empty
// results for now to let typecheck pass while we finish the schema rename.

export async function getUserLists(_userId: string): Promise<ListWithSpreadOwner[]> {
  return [];
}

export async function getUserListsWithItemCount(
  _userId: string,
  _itemType?: string,
): Promise<ListWithSpreadOwner[]> {
  return [];
}

export async function getOwnedLists(_userId: string): Promise<ListWithSpreadOwner[]> {
  return [];
}

export async function getOwnedListsWithItemCount(
  _userId: string,
  _itemType?: string,
): Promise<ListWithSpreadOwner[]> {
  return [];
}

export async function getAllUserListsWithPlaces(_userId: string): Promise<{
  ownedListsWithPlaces: ListOutput[];
  sharedListsWithPlaces: ListOutput[];
}> {
  return {
    ownedListsWithPlaces: [],
    sharedListsWithPlaces: [],
  };
}

export async function getListById(
  _id: string,
  _userId?: string | null,
): Promise<ListOutput | null> {
  return null;
}

export async function getListOwnedByUser(
  _listId: string,
  _userId: string,
): Promise<ListRecord | undefined> {
  return undefined;
}

export async function getPlaceLists(_params: {
  userId: string;
  placeId?: string;
  googleMapsId?: string;
}): Promise<Array<{ id: string; name: string; itemCount: number; imageUrl: string | null }>> {
  return [];
}
