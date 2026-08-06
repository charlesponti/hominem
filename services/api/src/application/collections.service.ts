import { db } from '@hominem/db';

import { ENTITY_TABLE_MAP, type EntityType } from './tags.service';

function toIso(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
import type {
  AcceptMemberInviteInput,
  AddCollectionItemInput,
  CollectionDetail,
  CollectionItem,
  CollectionMember,
  CollectionSummary,
  CreateCollectionInput,
  InviteMemberInput,
  ListCollectionsInput,
  RemoveCollectionItemInput,
} from '../schemas/collections.schema';

async function loadCollectionSummary(
  ownerUserId: string,
  collectionId: string,
): Promise<CollectionSummary | null> {
  const row = await db
    .selectFrom('app.collections')
    .selectAll()
    .where('id', '=', collectionId)
    .where('ownerUserid', '=', ownerUserId)
    .executeTakeFirst();

  if (!row) return null;

  const { count } = await db
    .selectFrom('app.collectionItems')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('collectionId', '=', collectionId)
    .executeTakeFirstOrThrow();

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility as 'private' | 'shared',
    itemCount: Number(count),
    createdAt: toIso(row.createdat)!,
    updatedAt: toIso(row.updatedat)!,
  };
}

export async function createCollection(
  ownerUserId: string,
  input: CreateCollectionInput,
) {
  const row = await db
    .insertInto('app.collections')
    .values({
      ownerUserid: ownerUserId,
      name: input.name,
      description: input.description ?? null,
      visibility: input.visibility,
    })
    .returning(['id'])
    .executeTakeFirstOrThrow();

  await db
    .insertInto('app.collectionMembers')
    .values({
      ownerUserid: ownerUserId,
      collectionId: row.id,
      personId: ownerUserId,
      role: 'owner',
      acceptedAt: new Date(),
    })
    .execute();

  const collection = await loadCollectionSummary(ownerUserId, row.id);
  if (!collection) throw new Error('Failed to load created collection');
  return { collection };
}

export async function addCollectionItem(
  ownerUserId: string,
  input: AddCollectionItemInput,
) {
  const entityTable = ENTITY_TABLE_MAP[input.entityType as EntityType];
  if (!entityTable) {
    throw new Error(`Unknown entity type: ${input.entityType}`);
  }

  await db
    .selectFrom('app.collections')
    .select('id')
    .where('id', '=', input.collectionId)
    .where('ownerUserid', '=', ownerUserId)
    .executeTakeFirstOrThrow();

  await db
    .insertInto('app.collectionItems')
    .values({
      ownerUserid: ownerUserId,
      collectionId: input.collectionId,
      entityTable,
      entityId: input.entityId,
      note: input.note ?? null,
    })
    .onConflict((oc) =>
      oc
        .columns(['collectionId', 'entityTable', 'entityId'])
        .doUpdateSet({ note: input.note ?? null }),
    )
    .execute();

  const item = await db
    .selectFrom('app.collectionItems')
    .selectAll()
    .where('collectionId', '=', input.collectionId)
    .where('entityTable', '=', entityTable)
    .where('entityId', '=', input.entityId)
    .executeTakeFirstOrThrow();

  const mapped: CollectionItem = {
    id: item.id,
    entityType: input.entityType,
    entityId: item.entityId,
    note: item.note,
    sortOrder: item.sortOrder,
    addedAt: toIso(item.createdat)!,
  };

  return { item: mapped };
}

export async function removeCollectionItem(
  ownerUserId: string,
  input: RemoveCollectionItemInput,
) {
  const entityTable = ENTITY_TABLE_MAP[input.entityType as EntityType];
  if (!entityTable) {
    throw new Error(`Unknown entity type: ${input.entityType}`);
  }

  const result = await db
    .deleteFrom('app.collectionItems')
    .where('collectionId', '=', input.collectionId)
    .where('entityTable', '=', entityTable)
    .where('entityId', '=', input.entityId)
    .where('ownerUserid', '=', ownerUserId)
    .executeTakeFirst();

  return { removed: result.numDeletedRows > 0n };
}

export async function inviteMember(
  ownerUserId: string,
  input: InviteMemberInput,
) {
  await db
    .selectFrom('app.collections')
    .select('id')
    .where('id', '=', input.collectionId)
    .where('ownerUserid', '=', ownerUserId)
    .executeTakeFirstOrThrow();

  await db
    .insertInto('app.collectionMembers')
    .values({
      ownerUserid: ownerUserId,
      collectionId: input.collectionId,
      personId: input.personId,
      role: input.role,
    })
    .onConflict((oc) =>
      oc.columns(['collectionId', 'personId']).doUpdateSet({ role: input.role }),
    )
    .execute();

  const row = await db
    .selectFrom('app.collectionMembers')
    .selectAll()
    .where('collectionId', '=', input.collectionId)
    .where('personId', '=', input.personId)
    .executeTakeFirstOrThrow();

  const member: CollectionMember = {
    personId: row.personId,
    role: row.role as 'editor' | 'owner' | 'viewer',
    invitedAt: toIso(row.invitedAt)!,
    acceptedAt: toIso(row.acceptedAt),
  };

  return { member };
}

export async function acceptMemberInvite(
  _ownerUserId: string,
  input: AcceptMemberInviteInput,
) {
  const existing = await db
    .selectFrom('app.collectionMembers')
    .selectAll()
    .where('collectionId', '=', input.collectionId)
    .where('personId', '=', input.personId)
    .where('acceptedAt', 'is', null)
    .executeTakeFirst();

  if (!existing) {
    throw new Error(
      `No pending invite for person ${input.personId} on collection ${input.collectionId}.`,
    );
  }

  const now = new Date();
  await db
    .updateTable('app.collectionMembers')
    .set({ acceptedAt: now })
    .where('collectionId', '=', input.collectionId)
    .where('personId', '=', input.personId)
    .execute();

  const member: CollectionMember = {
    personId: existing.personId,
    role: existing.role as 'editor' | 'owner' | 'viewer',
    invitedAt: toIso(existing.invitedAt)!,
    acceptedAt: toIso(now)!,
  };

  return { member };
}

export async function listCollections(
  ownerUserId: string,
  input: ListCollectionsInput,
) {
  const rows = await db
    .selectFrom('app.collections')
    .select('id')
    .where('ownerUserid', '=', ownerUserId)
    .orderBy('createdat', 'desc')
    .limit(input.limit)
    .execute();

  const collections: CollectionSummary[] = [];
  for (const row of rows) {
    const summary = await loadCollectionSummary(ownerUserId, row.id);
    if (summary) collections.push(summary);
  }

  return { collections, count: collections.length };
}

export async function collectionDetail(
  ownerUserId: string,
  collectionId: string,
): Promise<CollectionDetail> {
  const collection = await loadCollectionSummary(ownerUserId, collectionId);

  const itemRows = await db
    .selectFrom('app.collectionItems')
    .selectAll()
    .where('collectionId', '=', collectionId)
    .orderBy('createdat', 'desc')
    .execute();

  const memberRows = await db
    .selectFrom('app.collectionMembers')
    .selectAll()
    .where('collectionId', '=', collectionId)
    .execute();

  const items: CollectionItem[] = itemRows.map((row) => {
    let entityType: string | null = null;
    for (const [key, table] of Object.entries(ENTITY_TABLE_MAP)) {
      if (table === row.entityTable) {
        entityType = key;
        break;
      }
    }

    return {
      id: row.id,
      entityType: (entityType ?? 'unknown') as EntityType,
      entityId: row.entityId,
      note: row.note,
      sortOrder: row.sortOrder,
      addedAt: toIso(row.createdat)!,
    };
  });

  const members: CollectionMember[] = memberRows.map((row) => ({
    personId: row.personId,
    role: row.role as 'editor' | 'owner' | 'viewer',
    invitedAt: toIso(row.invitedAt)!,
    acceptedAt: toIso(row.acceptedAt),
  }));

  return { collection, items, members };
}
