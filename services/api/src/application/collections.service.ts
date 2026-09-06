import { db, sql } from '@hominem/db/core';
import { NotFoundError } from '@hominem/db/errors';

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
  ListPendingInvitesInput,
  RemoveCollectionItemInput,
} from '../schemas/collections.schema';
import { ENTITY_TABLE_MAP, getEntityDisplayName, type EntityType } from './tags.service';

function toIso(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

type MemberRole = CollectionMember['role'];

function toMemberRole(value: string): MemberRole {
  switch (value) {
    case 'owner':
    case 'editor':
    case 'viewer':
      return value;
    default:
      throw new Error(`Unexpected collection member role: ${value}`);
  }
}

function entityTypeForTable(table: string): EntityType | undefined {
  switch (table) {
    case ENTITY_TABLE_MAP.people:
      return 'people';
    case ENTITY_TABLE_MAP.places:
      return 'places';
    case ENTITY_TABLE_MAP.possessions:
      return 'possessions';
    case ENTITY_TABLE_MAP.notes:
      return 'notes';
    default:
      return undefined;
  }
}

function toVisibility(value: string): 'private' | 'shared' {
  switch (value) {
    case 'private':
    case 'shared':
      return value;
    default:
      throw new Error(`Unexpected collection visibility: ${value}`);
  }
}

const ROLE_RANK: Record<'owner' | 'editor' | 'viewer', number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

/**
 * A collection is visible to its owner and to any member with an accepted invite.
 * Editing items needs at least `editor`; only the owner can invite/manage members.
 * Returns the caller's role, or null if they have no access.
 */
async function getAccessRole(
  userId: string,
  collectionId: string,
): Promise<'owner' | 'editor' | 'viewer' | null> {
  const collection = await db
    .selectFrom('app.collections')
    .select('ownerUserid')
    .where('id', '=', collectionId)
    .executeTakeFirst();

  if (!collection) return null;
  if (collection.ownerUserid === userId) return 'owner';

  const member = await db
    .selectFrom('app.collectionMembers')
    .select('role')
    .where('collectionId', '=', collectionId)
    .where('userId', '=', userId)
    .where('acceptedAt', 'is not', null)
    .executeTakeFirst();

  if (!member) return null;
  return toMemberRole(member.role);
}

function hasAtLeast(
  role: 'owner' | 'editor' | 'viewer' | null,
  minRole: 'owner' | 'editor' | 'viewer',
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

async function loadCollectionSummary(collectionId: string): Promise<CollectionSummary | null> {
  const row = await db
    .selectFrom('app.collections')
    .selectAll()
    .where('id', '=', collectionId)
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
    visibility: toVisibility(row.visibility),
    itemCount: Number(count),
    createdAt: toIso(row.createdat)!,
    updatedAt: toIso(row.updatedat)!,
  };
}

export async function createCollection(ownerUserId: string, input: CreateCollectionInput) {
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
      userId: ownerUserId,
      role: 'owner',
      acceptedAt: new Date(),
    })
    .execute();

  const collection = await loadCollectionSummary(row.id);
  if (!collection) throw new Error('Failed to load created collection');
  return { collection };
}

export async function addCollectionItem(ownerUserId: string, input: AddCollectionItemInput) {
  const entityTable = ENTITY_TABLE_MAP[input.entityType];
  if (!entityTable) {
    throw new Error(`Unknown entity type: ${input.entityType}`);
  }

  const role = await getAccessRole(ownerUserId, input.collectionId);
  if (!hasAtLeast(role, 'editor')) throw new NotFoundError('Collection');

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
    .where(sql`entity_table::text`, '=', entityTable)
    .where('entityId', '=', input.entityId)
    .executeTakeFirstOrThrow();

  const mapped: CollectionItem = {
    id: item.id,
    entityType: input.entityType,
    entityId: item.entityId,
    entityName: await getEntityDisplayName(ownerUserId, input.entityType, item.entityId),
    note: item.note,
    sortOrder: item.sortOrder,
    addedAt: toIso(item.createdat)!,
  };

  return { item: mapped };
}

export async function removeCollectionItem(ownerUserId: string, input: RemoveCollectionItemInput) {
  const entityTable = ENTITY_TABLE_MAP[input.entityType];
  if (!entityTable) {
    throw new Error(`Unknown entity type: ${input.entityType}`);
  }

  const role = await getAccessRole(ownerUserId, input.collectionId);
  if (!hasAtLeast(role, 'editor')) throw new NotFoundError('Collection');

  const result = await db
    .deleteFrom('app.collectionItems')
    .where('collectionId', '=', input.collectionId)
    .where(sql`entity_table::text`, '=', entityTable)
    .where('entityId', '=', input.entityId)
    .executeTakeFirst();

  return { removed: result.numDeletedRows > 0n };
}

function mapMemberRow(row: {
  userId: string | null;
  invitedEmail: string | null;
  role: string;
  invitedAt: string | Date;
  acceptedAt: string | Date | null;
}): CollectionMember {
  return {
    userId: row.userId,
    invitedEmail: row.invitedEmail,
    role: toMemberRole(row.role),
    invitedAt: toIso(row.invitedAt)!,
    acceptedAt: toIso(row.acceptedAt),
  };
}

export async function inviteMember(ownerUserId: string, input: InviteMemberInput) {
  const role = await getAccessRole(ownerUserId, input.collectionId);
  if (!hasAtLeast(role, 'owner')) throw new NotFoundError('Collection');

  const invitee = await db
    .selectFrom('user')
    .select('id')
    .where('email', '=', input.email)
    .executeTakeFirst();

  if (invitee) {
    await db
      .insertInto('app.collectionMembers')
      .values({
        ownerUserid: ownerUserId,
        collectionId: input.collectionId,
        userId: invitee.id,
        role: input.role,
      })
      .onConflict((oc) => oc.columns(['collectionId', 'userId']).doUpdateSet({ role: input.role }))
      .execute();

    const row = await db
      .selectFrom('app.collectionMembers')
      .selectAll()
      .where('collectionId', '=', input.collectionId)
      .where('userId', '=', invitee.id)
      .executeTakeFirstOrThrow();

    return { member: mapMemberRow(row) };
  }

  // no hominem account for this email yet, so stash the invite by email — it gets
  // activated (userId backfilled) once that email signs up, via activatePendingInvitesForUser
  await db
    .insertInto('app.collectionMembers')
    .values({
      ownerUserid: ownerUserId,
      collectionId: input.collectionId,
      invitedEmail: input.email,
      role: input.role,
    })
    .onConflict((oc) =>
      oc
        .columns(['collectionId', 'invitedEmail'])
        .where('invitedEmail', 'is not', null)
        .doUpdateSet({ role: input.role }),
    )
    .execute();

  const row = await db
    .selectFrom('app.collectionMembers')
    .selectAll()
    .where('collectionId', '=', input.collectionId)
    .where('invitedEmail', '=', input.email)
    .executeTakeFirstOrThrow();

  return { member: mapMemberRow(row) };
}

/**
 * Turns pending email-only invites into real userId memberships for a newly created
 * account. The invitee still needs to call accept_member_invite — this just makes
 * the invite visible/acceptable now that they exist as a user.
 */
export async function activatePendingInvitesForUser(userId: string, email: string): Promise<void> {
  await db
    .updateTable('app.collectionMembers')
    .set({ userId })
    .where('userId', 'is', null)
    .where(sql<boolean>`lower(invited_email) = lower(${email})`)
    .execute();
}

export async function acceptMemberInvite(ownerUserId: string, input: AcceptMemberInviteInput) {
  const existing = await db
    .selectFrom('app.collectionMembers')
    .selectAll()
    .where('collectionId', '=', input.collectionId)
    .where('userId', '=', ownerUserId)
    .where('acceptedAt', 'is', null)
    .executeTakeFirst();

  if (!existing) {
    throw new NotFoundError('Pending collection invite', { collectionId: input.collectionId });
  }

  const now = new Date();
  await db
    .updateTable('app.collectionMembers')
    .set({ acceptedAt: now })
    .where('collectionId', '=', input.collectionId)
    .where('userId', '=', ownerUserId)
    .execute();

  return { member: mapMemberRow({ ...existing, acceptedAt: now }) };
}

export async function declineMemberInvite(ownerUserId: string, input: AcceptMemberInviteInput) {
  const result = await db
    .deleteFrom('app.collectionMembers')
    .where('collectionId', '=', input.collectionId)
    .where('userId', '=', ownerUserId)
    .where('acceptedAt', 'is', null)
    .executeTakeFirst();

  if (Number(result.numDeletedRows) === 0) {
    throw new NotFoundError('Pending collection invite', { collectionId: input.collectionId });
  }

  return { removed: true };
}

export async function listCollections(ownerUserId: string, input: ListCollectionsInput) {
  const ownedRows = db
    .selectFrom('app.collections')
    .select('id')
    .where('ownerUserid', '=', ownerUserId);

  const memberRows = db
    .selectFrom('app.collectionMembers')
    .select('collectionId as id')
    .where('userId', '=', ownerUserId)
    .where('acceptedAt', 'is not', null);

  const rows = await ownedRows.union(memberRows).execute();

  const collections: CollectionSummary[] = [];
  for (const row of rows) {
    const summary = await loadCollectionSummary(row.id);
    if (summary) {
      collections.push(summary);
    }
  }

  collections.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const limited = collections.slice(0, input.limit);

  return { collections: limited, count: limited.length };
}

export async function listPendingInvites(ownerUserId: string, input: ListPendingInvitesInput) {
  const rows = await db
    .selectFrom('app.collectionMembers')
    .select(['collectionId', 'role', 'invitedAt'])
    .where('userId', '=', ownerUserId)
    .where('acceptedAt', 'is', null)
    .orderBy('invitedAt', 'desc')
    .execute();

  const invites: Array<{
    collection: CollectionSummary;
    role: CollectionMember['role'];
    invitedAt: string;
  }> = [];
  for (const row of rows) {
    const collection = await loadCollectionSummary(row.collectionId);
    if (collection) {
      invites.push({
        collection,
        role: toMemberRole(row.role),
        invitedAt: toIso(row.invitedAt)!,
      });
    }
  }

  const limited = invites.slice(0, input.limit);
  return { invites: limited, count: limited.length };
}

export async function collectionDetail(
  ownerUserId: string,
  collectionId: string,
): Promise<CollectionDetail> {
  const role = await getAccessRole(ownerUserId, collectionId);
  if (!role) return { collection: null, items: [], members: [] };

  const collection = await loadCollectionSummary(collectionId);

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

  const items: CollectionItem[] = await Promise.all(
    itemRows.map(async (row): Promise<CollectionItem> => {
      const entityType = entityTypeForTable(row.entityTable);
      if (!entityType) {
        throw new Error(`Unknown collection item entity table: ${row.entityTable}`);
      }

      return {
        id: row.id,
        entityType,
        entityId: row.entityId,
        entityName: await getEntityDisplayName(ownerUserId, entityType, row.entityId),
        note: row.note,
        sortOrder: row.sortOrder,
        addedAt: toIso(row.createdat)!,
      };
    }),
  );

  const members: CollectionMember[] = memberRows.map(mapMemberRow);

  return { collection, items, members };
}
