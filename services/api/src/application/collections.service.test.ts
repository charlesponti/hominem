import { db, pool } from '@hominem/db/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  acceptMemberInvite,
  addCollectionItem,
  collectionDetail,
  createCollection,
  deleteCollection,
  inviteMember,
  leaveCollection,
  updateCollection,
} from './collections.service';

const ownerId = 'd3000000-0000-4000-8000-000000000001';
const memberId = 'd3000000-0000-4000-8000-000000000002';
const strangerId = 'd3000000-0000-4000-8000-000000000003';
const placeId = 'd3000002-0000-4000-8000-000000000001';

beforeAll(async () => {
  for (const id of [ownerId, memberId, strangerId]) {
    await pool.query(`DELETE FROM "user" WHERE id = $1`, [id]);
    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, $4)`,
      [id, 'Collections Service Test User', `${id}@test.hominem.dev`, true],
    );
  }
  await db
    .insertInto('app.places')
    .values({ id: placeId, ownerUserid: ownerId, name: 'Service Test Place' })
    .execute();
});

afterAll(async () => {
  for (const id of [ownerId, memberId, strangerId]) {
    await pool.query(`DELETE FROM "user" WHERE id = $1`, [id]);
  }
});

function makeCollection(ownerUserId: string, name: string) {
  return createCollection(ownerUserId, { name, visibility: 'private' });
}

function invite(ownerUserId: string, collectionId: string, email: string) {
  return inviteMember(ownerUserId, { collectionId, email, role: 'viewer' });
}

describe('updateCollection', () => {
  it('updates only the provided fields', async () => {
    const { collection } = await makeCollection(ownerId, 'Original');

    const { collection: updated } = await updateCollection(ownerId, {
      collectionId: collection.id,
      name: 'Renamed',
      visibility: 'shared',
    });

    expect(updated.name).toBe('Renamed');
    expect(updated.visibility).toBe('shared');
  });

  it('throws when the caller is not the owner', async () => {
    const { collection } = await makeCollection(ownerId, 'Owner Only');

    await expect(
      updateCollection(strangerId, { collectionId: collection.id, name: 'Hijacked' }),
    ).rejects.toThrow();
  });
});

describe('deleteCollection', () => {
  it('cascades to items and members', async () => {
    const { collection } = await makeCollection(ownerId, 'To Delete');
    await addCollectionItem(ownerId, {
      collectionId: collection.id,
      entityType: 'places',
      entityId: placeId,
    });
    await invite(ownerId, collection.id, `${memberId}@test.hominem.dev`);

    const { deleted } = await deleteCollection(ownerId, { collectionId: collection.id });
    expect(deleted).toBe(true);

    const detail = await collectionDetail(ownerId, collection.id);
    expect(detail.collection).toBeNull();

    const remainingItems = await db
      .selectFrom('app.collectionItems')
      .selectAll()
      .where('collectionId', '=', collection.id)
      .execute();
    const remainingMembers = await db
      .selectFrom('app.collectionMembers')
      .selectAll()
      .where('collectionId', '=', collection.id)
      .execute();
    expect(remainingItems).toHaveLength(0);
    expect(remainingMembers).toHaveLength(0);
  });

  it('does nothing when the caller is not the owner', async () => {
    const { collection } = await makeCollection(ownerId, 'Protected');

    const { deleted } = await deleteCollection(strangerId, { collectionId: collection.id });
    expect(deleted).toBe(false);

    const detail = await collectionDetail(ownerId, collection.id);
    expect(detail.collection).not.toBeNull();
  });
});

describe('leaveCollection', () => {
  it('blocks the owner from leaving their own collection', async () => {
    const { collection } = await makeCollection(ownerId, 'Owner Cannot Leave');

    await expect(leaveCollection(ownerId, { collectionId: collection.id })).rejects.toThrow();
  });

  it('lets an accepted member leave', async () => {
    const { collection } = await makeCollection(ownerId, 'Leavable');
    await invite(ownerId, collection.id, `${memberId}@test.hominem.dev`);
    await acceptMemberInvite(memberId, { collectionId: collection.id });

    const { left } = await leaveCollection(memberId, { collectionId: collection.id });
    expect(left).toBe(true);

    const detail = await collectionDetail(memberId, collection.id);
    expect(detail.collection).toBeNull();
  });

  it('throws for someone with no access', async () => {
    const { collection } = await makeCollection(ownerId, 'No Access');

    await expect(leaveCollection(strangerId, { collectionId: collection.id })).rejects.toThrow();
  });
});
