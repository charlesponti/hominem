import { describe, expect, it, vi } from 'vitest';
import { enrichPlaceWithDetails } from './places.helpers';

vi.mock('@hominem/data/places', () => ({
  getItemsForPlace: vi.fn(),
}));

import { getItemsForPlace } from '@hominem/data/places';

describe('enrichPlaceWithDetails', () => {
  it('should enrich place with associated lists and proxied photos while preserving (and normalizing) raw photos', async () => {
    const mockDbPlace = {
      id: 'place123',
      name: 'Test Place',
      photos: [
        'places/123/photos/abc',
        '/api/images?resource=places%2F123%2Fphotos%2Fdef&width=1600',
      ],
      address: '123 Test St',
    } as any;

    const mockItems = [
      { list: { id: 'list1', name: 'List 1' } },
      { list: { id: 'list2', name: 'List 2' } },
    ] as any;

    vi.mocked(getItemsForPlace).mockResolvedValue(mockItems);

    const result = await enrichPlaceWithDetails({} as any, mockDbPlace);

    // Verify associated lists extraction
    expect(result.associatedLists).toEqual([
      { id: 'list1', name: 'List 1' },
      { id: 'list2', name: 'List 2' },
    ]);

    // Verify raw photos are preserved AND normalized (un-proxied)
    expect(result.photos).toEqual(['places/123/photos/abc', 'places/123/photos/def']);

    // Verify thumbnail URLs are correctly built (using real getHominemPhotoURL logic)
    expect(result.thumbnailPhotos).toEqual([
      '/api/images?resource=places%2F123%2Fphotos%2Fabc&width=800&height=800',
      '/api/images?resource=places%2F123%2Fphotos%2Fdef&width=800&height=800',
    ]);

    // Verify full size URLs are correctly built
    expect(result.fullPhotos).toEqual([
      '/api/images?resource=places%2F123%2Fphotos%2Fabc&width=1600&height=1200',
      '/api/images?resource=places%2F123%2Fphotos%2Fdef&width=1600&height=1200',
    ]);

    // Verify other properties are spread correctly
    expect(result.name).toBe('Test Place');
    expect(result.address).toBe('123 Test St');
  });

  it('should handle places with no photos', async () => {
    const mockDbPlace = {
      id: 'place456',
      name: 'No Photo Place',
      photos: null,
    } as any;

    vi.mocked(getItemsForPlace).mockResolvedValue([]);

    const result = await enrichPlaceWithDetails({} as any, mockDbPlace);

    expect(result.photos).toEqual([]);
    expect(result.thumbnailPhotos).toEqual([]);
    expect(result.fullPhotos).toEqual([]);
    expect(result.associatedLists).toEqual([]);
  });
});
