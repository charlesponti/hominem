import type { PlaceInsert } from '@hominem/db/schema';

import { googlePlaces } from '@hominem/services/google-places';
import { describe, expect, it, vi } from 'vitest';

import { preparePlaceInsertData, refreshAllPlaces } from './places.service';

// Mock googlePlaces
vi.mock('@hominem/services/google-places', () => ({
  googlePlaces: {
    getDetails: vi.fn(),
  },
}));

// Mock db
vi.mock('@hominem/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: '1' }]),
        })),
      })),
    })),
    query: {
      place: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
}));

vi.mock('@hominem/db/schema', () => ({
  place: {},
  item: {},
  list: {},
}));

describe('preparePlaceInsertData', () => {
  it('should normalize imageUrl and photos', async () => {
    const rawRef = 'places/123/photos/abc';
    const proxyUrl = `/api/images?resource=${encodeURIComponent(rawRef)}&width=1600`;

    const input: PlaceInsert = {
      googleMapsId: 'g123',
      name: 'Test Place',
      photos: [proxyUrl, 'raw-ref-2'],
      imageUrl: proxyUrl,
    } as any;

    const result = await preparePlaceInsertData(input);

    expect(result.photos).toEqual([rawRef, 'raw-ref-2']);
    expect(result.imageUrl).toBe(rawRef);
    expect(result.googleMapsId).toBe('g123');
    expect(result.name).toBe('Test Place');
  });

  it('should handle missing photos and imageUrl', async () => {
    const input: PlaceInsert = {
      googleMapsId: 'g456',
      name: 'Minimal Place',
    } as any;

    const result = await preparePlaceInsertData(input);

    expect(result.photos).toBeNull();
    expect(result.imageUrl).toBeNull();
  });

  it('should fallback to first photo for imageUrl if not provided', async () => {
    const input: PlaceInsert = {
      googleMapsId: 'g789',
      name: 'Photo Place',
      photos: ['photo1', 'photo2'],
    } as any;

    const result = await preparePlaceInsertData(input);

    expect(result.photos).toEqual(['photo1', 'photo2']);
    expect(result.imageUrl).toBe('photo1');
  });
});

describe('refreshAllPlaces', () => {
  it('should fetch details for places missing photos and update them', async () => {
    const { db } = await import('@hominem/db');
    const mockPlace = { id: 'p1', googleMapsId: 'g1', name: 'Original Name' };

    // Mock listPlacesMissingPhotos response
    vi.mocked(db.query.place.findMany).mockResolvedValue([mockPlace] as any);

    // Mock googlePlaces details
    vi.mocked(googlePlaces.getDetails).mockResolvedValue({
      id: 'g1',
      displayName: { text: 'New Name' },
      formattedAddress: '123 New St',
      location: { latitude: 10, longitude: 20 },
      photos: [{ name: 'photo-1' }],
    });

    const result = await refreshAllPlaces();

    expect(result.updatedCount).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(googlePlaces.getDetails).toHaveBeenCalledWith({ placeId: 'g1' });
    expect(db.insert).toHaveBeenCalled();
  });

  it('should collect errors for failed updates', async () => {
    const { db } = await import('@hominem/db');
    const mockPlace = { id: 'p1', googleMapsId: 'g1' };

    vi.mocked(db.query.place.findMany).mockResolvedValue([mockPlace] as any);

    vi.mocked(googlePlaces.getDetails).mockRejectedValue(new Error('API Down'));

    const result = await refreshAllPlaces();

    expect(result.updatedCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('API Down');
  });
});
