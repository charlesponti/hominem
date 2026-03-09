import crypto from 'node:crypto';

import { db, sql } from '@hominem/db';
import { extractRows, isIntegrationDatabaseAvailable } from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  addPlaceToLists,
  deletePlaceById,
  getNearbyPlacesFromLists,
  getPlaceByGoogleMapsId,
  getPlaceById,
  preparePlaceInsertData,
} from './places.service';

describe('places.service integration', () => {
  let ownerId: string;
  let otherUserId: string;

  const executeRaw = <T>(query: ReturnType<typeof sql>) => query.execute(db) as Promise<T>;

  const createUser = async (id: string): Promise<void> => {
    await executeRaw(sql`
      insert into users (id, email, name)
      values (${id}, ${`${id}@example.com`}, ${'Places User'})
      on conflict (id) do nothing
    `);
  };

  const cleanupUser = async (userId: string): Promise<void> => {
    await executeRaw(sql`delete from places where user_id = ${userId}`).catch(() => {});
    await executeRaw(sql`delete from travel_trips where user_id = ${userId}`).catch(() => {});
    await executeRaw(sql`delete from users where id = ${userId}`).catch(() => {});
  };

  beforeEach(async () => {
    ownerId = crypto.randomUUID();
    otherUserId = crypto.randomUUID();

    await cleanupUser(ownerId);
    await cleanupUser(otherUserId);
    await createUser(ownerId);
    await createUser(otherUserId);
  });

  it('preparePlaceInsertData normalizes photos and fallback image', async () => {
    const data = await preparePlaceInsertData({
      userId: ownerId,
      googleMapsId: 'gm-1',
      name: 'Cafe',
      photos: ['places/abc/photos/def', 'custom-photo'],
      imageUrl: '/api/images?resource=places/abc/photos/def&width=1600',
    });

    expect(data.userId).toBe(ownerId);
    expect(data.data.googleMapsId).toBe('gm-1');
    expect(data.data.imageUrl).toBe('places/abc/photos/def');
    expect(data.data.photos?.length).toBe(2);
  });

  it('upserts idempotently by googleMapsId per owner', async () => {
    const first = await addPlaceToLists(ownerId, [], {
      googleMapsId: 'gm-same',
      name: 'Original',
      latitude: 37.7749,
      longitude: -122.4194,
      photos: ['one'],
    });

    const second = await addPlaceToLists(ownerId, [], {
      googleMapsId: 'gm-same',
      name: 'Updated',
      latitude: 37.775,
      longitude: -122.4195,
      photos: ['two'],
    });

    expect(first.place.id).toBe(second.place.id);
    expect(second.place.name).toBe('Updated');

    const stored = await executeRaw(sql`
      select count(*)::int as count
      from places
      where user_id = ${ownerId}
        and data ->> 'googleMapsId' = 'gm-same'
    `);
    const row = extractRows<{ count: number }>(stored)[0];
    expect(row?.count).toBe(1);
  });

  it('resolves by id and googleMapsId', async () => {
    const created = await addPlaceToLists(ownerId, [], {
      googleMapsId: 'gm-find-me',
      name: 'Find Me',
      latitude: 40.0,
      longitude: -74.0,
    });

    const byId = await getPlaceById(created.place.id);
    expect(byId?.id).toBe(created.place.id);

    const byGoogle = await getPlaceByGoogleMapsId('gm-find-me');
    expect(byGoogle?.id).toBe(created.place.id);
  });

  it('returns deterministic nearby ordering', async () => {
    await addPlaceToLists(ownerId, [], {
      googleMapsId: 'gm-near-1',
      name: 'A Place',
      latitude: 37.775,
      longitude: -122.4195,
    });

    await addPlaceToLists(ownerId, [], {
      googleMapsId: 'gm-near-2',
      name: 'B Place',
      latitude: 37.776,
      longitude: -122.42,
    });

    const nearby = await getNearbyPlacesFromLists({
      userId: ownerId,
      latitude: 37.7749,
      longitude: -122.4194,
      radiusKm: 2,
      limit: 10,
    });

    expect(nearby.length).toBeGreaterThanOrEqual(2);
    for (const place of nearby) {
      expect(place.distance?.km ?? 999).toBeLessThanOrEqual(2);
      expect(Array.isArray(place.lists)).toBe(true);
    }

    const sorted = [...nearby].sort((a, b) => {
      const ak = a.distance?.km ?? Number.POSITIVE_INFINITY;
      const bk = b.distance?.km ?? Number.POSITIVE_INFINITY;
      if (ak !== bk) {
        return ak - bk;
      }
      return a.name.localeCompare(b.name);
    });
    expect(nearby.map((place) => place.id)).toEqual(sorted.map((place) => place.id));
  });

  it('deletes place by id', async () => {
    const created = await addPlaceToLists(ownerId, [], {
      googleMapsId: 'gm-delete',
      name: 'Delete Me',
    });

    const deleted = await deletePlaceById(created.place.id);
    expect(deleted).toBe(true);

    const after = await getPlaceById(created.place.id);
    expect(after).toBeUndefined();
  });
});
