import type { ListOutput, ListRecord, ListWithSpreadOwner } from './contracts';

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
