import type { ListOutput as DbListOutput } from '@hominem/db/types/lists';

import { db } from '@hominem/db';
import { and, count, desc, eq, isNotNull, or, sql } from '@hominem/db';
import { item } from '@hominem/db/schema/items';
import { list } from '@hominem/db/schema/lists';
import { userLists } from '@hominem/db/schema/lists';
import { place } from '@hominem/db/schema/places';
import { users } from '@hominem/db/schema/users';
import { logger } from '@hominem/utils/logger';

import type { ListOutput, ListUser, ListWithSpreadOwner } from './types';

import { formatList } from './list-crud.service';
import { getListPlaces, getListPlacesMap } from './list-items.service';

/**
 * Get lists that the user is explicitly a member of (shared with them)
 */
export async function getUserLists(userId: string): Promise<ListWithSpreadOwner[]> {
  try {
    type SharedListDbResultBase = {
      id: string;
      name: string;
      description: string | null;
      ownerId: string;
      isPublic: boolean;
      createdAt: string;
      updatedAt: string;
      owner_id: string | null;
      owner_email: string | null;
      owner_name: string | null;
    };

    const baseSelect = {
      id: list.id,
      name: list.name,
      description: list.description,
      ownerId: list.ownerId,
      isPublic: list.isPublic,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      owner_id: users.id,
      owner_email: users.email,
      owner_name: users.name,
    };

    const query = db
      .select(baseSelect)
      .from(userLists)
      .where(eq(userLists.userId, userId))
      .innerJoin(list, eq(userLists.listId, list.id))
      .innerJoin(users, eq(list.ownerId, users.id));
    const results = (await query.orderBy(desc(list.createdAt))) as SharedListDbResultBase[];

    return results.map((item) => {
      const listPart: DbListOutput = {
        id: item.id,
        name: item.name,
        description: item.description,
        ownerId: item.ownerId,
        isPublic: item.isPublic,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };

      const ownerPart = item.owner_id
        ? {
            id: item.owner_id,
            email: item.owner_email as string,
            name: item.owner_name,
          }
        : null;

      const listItem: ListWithSpreadOwner = {
        ...listPart,
        owner: ownerPart,
      };

      return listItem;
    });
  } catch (error) {
    logger.error('Error fetching shared lists for user', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Fetch shared lists for a user and include item counts (optionally filtered by itemType)
 */
export async function getUserListsWithItemCount(
  userId: string,
  itemType?: string,
): Promise<ListWithSpreadOwner[]> {
  try {
    const baseSelect = {
      id: list.id,
      name: list.name,
      description: list.description,
      ownerId: list.ownerId,
      isPublic: list.isPublic,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      owner_id: users.id,
      owner_email: users.email,
      owner_name: users.name,
    };

    const selectFields = { ...baseSelect, itemCount: count(item.id) };

    const query = db
      .select(selectFields)
      .from(userLists)
      .where(eq(userLists.userId, userId))
      .innerJoin(list, eq(userLists.listId, list.id))
      .leftJoin(
        item,
        and(eq(userLists.listId, item.listId), itemType ? eq(item.type, itemType) : undefined),
      )
      .innerJoin(users, eq(list.ownerId, users.id))
      .groupBy(
        list.id,
        list.name,
        list.description,
        list.ownerId,
        list.isPublic,
        list.createdAt,
        list.updatedAt,
        users.id,
        users.email,
        users.name,
      );

    const results = await query.orderBy(desc(list.createdAt));

    return results.map((item) => {
      const listPart: DbListOutput = {
        id: item.id,
        name: item.name,
        description: item.description,
        ownerId: item.ownerId,
        isPublic: item.isPublic,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };

      const ownerPart = item.owner_id
        ? {
            id: item.owner_id,
            email: item.owner_email as string,
            name: item.owner_name,
          }
        : null;

      const listItem: ListWithSpreadOwner = {
        ...listPart,
        owner: ownerPart,
      };

      if (item.itemCount !== null) {
        listItem.itemCount = Number(item.itemCount);
      }

      return listItem;
    });
  } catch (error) {
    logger.error('Error fetching shared lists for user', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Get lists that are owned by the user
 */
export async function getOwnedLists(userId: string): Promise<ListWithSpreadOwner[]> {
  try {
    // Lightweight: no item join / no item counts

    type OwnedListDbResultBase = {
      id: string;
      name: string;
      description: string | null;
      ownerId: string;
      isPublic: boolean;
      createdAt: string;
      updatedAt: string;
      owner_id: string | null;
      owner_email: string | null;
      owner_name: string | null;
    };

    const baseSelect = {
      id: list.id,
      name: list.name,
      description: list.description,
      ownerId: list.ownerId,
      isPublic: list.isPublic,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      owner_id: users.id,
      owner_email: users.email,
      owner_name: users.name,
    };

    const query = db
      .select(baseSelect)
      .from(list)
      .where(eq(list.ownerId, userId))
      .innerJoin(users, eq(users.id, list.ownerId));
    const queryResults = (await query.orderBy(desc(list.createdAt))) as OwnedListDbResultBase[];

    return queryResults.map((dbItem) => {
      const listPart: DbListOutput = {
        id: dbItem.id,
        name: dbItem.name,
        description: dbItem.description,
        ownerId: dbItem.ownerId,
        isPublic: dbItem.isPublic,
        createdAt: dbItem.createdAt,
        updatedAt: dbItem.updatedAt,
      };
      const ownerPart = dbItem.owner_id
        ? {
            id: dbItem.owner_id,
            email: dbItem.owner_email as string,
            name: dbItem.owner_name,
          }
        : null;

      const listItem: ListWithSpreadOwner = {
        ...listPart,
        owner: ownerPart,
      };

      // No item counts in the lightweight metadata response

      return listItem;
    });
  } catch (error) {
    logger.error('Error fetching owned lists for user', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Fetch owned lists for a user and include item counts (optionally filtered by itemType)
 */
export async function getOwnedListsWithItemCount(
  userId: string,
  itemType?: string,
): Promise<ListWithSpreadOwner[]> {
  try {
    type OwnedListDbResultBase = {
      id: string;
      name: string;
      description: string | null;
      ownerId: string;
      isPublic: boolean;
      createdAt: string;
      updatedAt: string;
      owner_id: string | null;
      owner_email: string | null;
      owner_name: string | null;
    };
    type OwnedListDbResultWithCount = OwnedListDbResultBase & { itemCount: string | null };
    type OwnedListDbResult = OwnedListDbResultBase | OwnedListDbResultWithCount;

    const baseSelect = {
      id: list.id,
      name: list.name,
      description: list.description,
      ownerId: list.ownerId,
      isPublic: list.isPublic,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      owner_id: users.id,
      owner_email: users.email,
      owner_name: users.name,
    };

    const selectFields = { ...baseSelect, itemCount: count(item.id) };

    const query = db
      .select(selectFields)
      .from(list)
      .where(eq(list.ownerId, userId))
      .innerJoin(users, eq(users.id, list.ownerId))
      .leftJoin(item, and(eq(item.listId, list.id), itemType ? eq(item.type, itemType) : undefined))
      .groupBy(
        list.id,
        list.name,
        list.description,
        list.ownerId,
        list.isPublic,
        list.createdAt,
        list.updatedAt,
        users.id,
        users.email,
        users.name,
      );

    const queryResults = (await query.orderBy(desc(list.createdAt))) as OwnedListDbResult[];

    return queryResults.map((dbItem) => {
      const listPart = {
        id: dbItem.id,
        name: dbItem.name,
        description: dbItem.description,
        ownerId: dbItem.ownerId,
        isPublic: dbItem.isPublic,
        createdAt: dbItem.createdAt,
        updatedAt: dbItem.updatedAt,
      };
      const ownerPart = dbItem.owner_id
        ? {
            id: dbItem.owner_id,
            email: dbItem.owner_email as string,
            name: dbItem.owner_name,
          }
        : null;

      const listItem: ListWithSpreadOwner = {
        ...listPart,
        owner: ownerPart,
      };

      if ('itemCount' in dbItem && dbItem.itemCount !== null) {
        listItem.itemCount = Number(dbItem.itemCount);
      }

      return listItem;
    });
  } catch (error) {
    logger.error('Error fetching owned lists for user', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Optimized function to get all lists (owned + shared) with their places in a single SQL query
 * Uses a single query with LEFT JOIN to get all accessible lists, then fetches places in one query
 * @param userId - The ID of the user
 * @returns Object containing ownedListsWithPlaces and sharedListsWithPlaces
 */
export async function getAllUserListsWithPlaces(userId: string): Promise<{
  ownedListsWithPlaces: ListOutput[];
  sharedListsWithPlaces: ListOutput[];
}> {
  try {
    // Single query to get all lists the user has access to (owned OR shared)
    // Uses LEFT JOIN to userLists to identify shared lists, then filters for owned or shared
    const allLists = await db
      .select({
        id: list.id,
        name: list.name,
        description: list.description,
        ownerId: list.ownerId,
        isPublic: list.isPublic,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        owner_id: users.id,
        owner_email: users.email,
        owner_name: users.name,
        isOwned: sql<boolean>`${list.ownerId} = ${userId}`.as('isOwned'),
        userLists_userId: userLists.userId,
      })
      .from(list)
      .innerJoin(users, eq(users.id, list.ownerId))
      .leftJoin(userLists, and(eq(userLists.listId, list.id), eq(userLists.userId, userId)))
      .where(
        or(
          eq(list.ownerId, userId), // Owned lists
          isNotNull(userLists.listId), // Shared lists (join matched)
        ),
      )
      .orderBy(desc(list.createdAt));

    if (allLists.length === 0) {
      return {
        ownedListsWithPlaces: [],
        sharedListsWithPlaces: [],
      };
    }

    // Deduplicate lists (a list could appear twice if user owns it AND it's shared)
    const uniqueLists = new Map<string, (typeof allLists)[0]>();
    for (const dbItem of allLists) {
      if (!uniqueLists.has(dbItem.id)) {
        uniqueLists.set(dbItem.id, dbItem);
      } else {
        // If already exists, prefer owned status
        const existing = uniqueLists.get(dbItem.id)!;
        if (dbItem.isOwned && !existing.isOwned) {
          uniqueLists.set(dbItem.id, dbItem);
        }
      }
    }

    const listIds = Array.from(uniqueLists.keys());
    const placesMap = await getListPlacesMap(listIds);

    const ownedLists: ListOutput[] = [];
    const sharedLists: ListOutput[] = [];

    for (const dbItem of uniqueLists.values()) {
      const listPart = {
        id: dbItem.id,
        name: dbItem.name,
        description: dbItem.description,
        ownerId: dbItem.ownerId,
        isPublic: dbItem.isPublic,
        createdAt: dbItem.createdAt,
        updatedAt: dbItem.updatedAt,
      };

      const ownerPart = dbItem.owner_id
        ? {
            id: dbItem.owner_id,
            email: dbItem.owner_email as string,
            name: dbItem.owner_name,
          }
        : null;

      const listData: ListWithSpreadOwner = {
        ...listPart,
        owner: ownerPart,
      };

      const places = placesMap.get(dbItem.id) || [];

      if (dbItem.isOwned) {
        ownedLists.push(formatList(listData, places, true, true));
      } else {
        sharedLists.push(formatList(listData, places, false, true));
      }
    }

    return {
      ownedListsWithPlaces: ownedLists,
      sharedListsWithPlaces: sharedLists,
    };
  } catch (error) {
    logger.error('Error fetching all user lists with places', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ownedListsWithPlaces: [],
      sharedListsWithPlaces: [],
    };
  }
}

/**
 * Get a single list by ID with all its places
 * @param id - The ID of the list to fetch
 * @returns The list with its places or null if not found
 */
export async function getListById(id: string, userId?: string | null) {
  try {
    const result = await db
      .select({
        id: list.id,
        name: list.name,
        description: list.description,
        ownerId: list.ownerId,
        isPublic: list.isPublic,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        owner_id: users.id,
        owner_email: users.email,
        owner_name: users.name,
        owner_image: users.image,
      })
      .from(list)
      .where(eq(list.id, id))
      .innerJoin(users, eq(users.id, list.ownerId))
      .then((rows) => rows[0]);

    if (!result) {
      return null;
    }

    const listPart: DbListOutput = {
      id: result.id,
      name: result.name,
      description: result.description,
      ownerId: result.ownerId,
      isPublic: result.isPublic,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    const ownerPart = result.owner_id
      ? {
          id: result.owner_id,
          email: result.owner_email as string,
          name: result.owner_name,
        }
      : null;

    const listDataForFormat: ListWithSpreadOwner = {
      ...listPart,
      owner: ownerPart,
    };

    const places = await getListPlaces(id);

    const isOwnList = listDataForFormat.ownerId === userId;

    // Fetch collaborators - this also serves as access check (if user is in collaborators, they have access)
    const collaborators = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
      })
      .from(userLists)
      .innerJoin(users, eq(users.id, userLists.userId))
      .where(eq(userLists.listId, id))
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          email: row.email,
          name: row.name || undefined,
          image: row.image || undefined,
        })),
      );

    // Check access: owner OR user is in collaborators
    let hasAccess = isOwnList;
    if (!hasAccess && userId) {
      hasAccess = collaborators.some((c) => c.id === userId);
    }

    // Always include the owner as the first collaborator
    const allCollaborators: ListUser[] = [];
    if (result.owner_id) {
      allCollaborators.push({
        id: result.owner_id,
        email: result.owner_email as string,
        name: result.owner_name || undefined,
        image: result.owner_image || undefined,
      });
    }
    // Add other collaborators (excluding owner if they're also in userLists)
    for (const collaborator of collaborators) {
      if (collaborator.id !== result.owner_id) {
        allCollaborators.push(collaborator);
      }
    }

    return formatList(listDataForFormat, places, isOwnList, hasAccess, allCollaborators);
  } catch (error) {
    console.error(`Error fetching list ${id}:`, error);
    return null;
  }
}

export async function getListOwnedByUser(
  listId: string,
  userId: string,
): Promise<DbListOutput | undefined> {
  return db.query.list.findFirst({ where: and(eq(list.id, listId), eq(list.ownerId, userId)) });
}

export async function getPlaceLists({
  userId,
  placeId,
  googleMapsId,
}: {
  userId: string;
  placeId?: string;
  googleMapsId?: string;
}): Promise<Array<{ id: string; name: string; itemCount: number; imageUrl: string | null }>> {
  if (!(placeId || googleMapsId)) {
    return [];
  }

  try {
    const resolvedPlaceId =
      placeId ||
      sql<string>`(SELECT id FROM ${place} WHERE ${place.googleMapsId} = ${googleMapsId} LIMIT 1)`;

    const result = await db
      .select({
        id: list.id,
        name: list.name,
        itemCount:
          sql<number>`(SELECT COUNT(*)::int FROM ${item} i WHERE i."listId" = ${list.id} AND i."itemType" = 'PLACE')`.as(
            'itemCount',
          ),
        imageUrl: sql<string | null>`COALESCE(
          (SELECT p.image_url FROM ${item} i2
           JOIN ${place} p ON p.id = i2.item_id AND i2.item_type = 'PLACE'
           WHERE i2.list_id = ${list.id} AND p.id != ${resolvedPlaceId}
           ORDER BY i2.created_at ASC LIMIT 1),
          (SELECT p.image_url FROM ${item} i2
           JOIN ${place} p ON p.id = i2.item_id AND i2.item_type = 'PLACE'
           WHERE i2.list_id = ${list.id}
           ORDER BY i2.created_at ASC LIMIT 1)
        )`.as('imageUrl'),
      })
      .from(list)
      .innerJoin(item, eq(item.listId, list.id))
      .innerJoin(place, or(eq(place.id, placeId || ''), eq(place.googleMapsId, googleMapsId || '')))
      .leftJoin(userLists, and(eq(userLists.listId, list.id), eq(userLists.userId, userId)))
      .where(
        and(eq(item.itemType, 'PLACE'), or(eq(list.ownerId, userId), isNotNull(userLists.listId))),
      )
      .groupBy(list.id, list.name);

    return result.map((l) => ({
      id: l.id,
      name: l.name,
      itemCount: Number(l.itemCount),
      imageUrl: l.imageUrl,
    }));
  } catch (error) {
    logger.error('Error fetching lists containing place', {
      userId,
      placeId,
      googleMapsId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
