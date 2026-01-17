import { buildPhotoMediaUrl } from '@hominem/utils/google';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockPlaces } from '../../../../../packages/services/src/test-utils/google-api-mocks';

vi.mock('googleapis', () => import('../../../../../packages/services/src/test-utils/google-api-mocks').then((m) => m.googleapi));

describe('google-places.server helper', () => {
  let googlePlaces: any;
  let googlePlacesTestUtils: any;

  beforeAll(async () => {
    process.env.GOOGLE_API_KEY = 'test-key';
    // Dynamic import to ensure env var is set before module init
    const mod = await import('@hominem/services/places');
    googlePlaces = mod.googlePlaces;
    googlePlacesTestUtils = mod.googlePlacesTestUtils;
  });

  beforeEach(() => {
    googlePlacesTestUtils.clearCache();
    mockPlaces.searchText.mockReset();
    mockPlaces.get.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('caches search results for identical queries', async () => {
    const payload = {
      places: [
        {
          id: 'place-1',
          displayName: { text: 'Coffee Bar' },
          formattedAddress: '123 Beans St',
          location: { latitude: 37.5, longitude: -122.3 },
          types: ['cafe'],
        },
      ],
    };

    mockPlaces.searchText.mockResolvedValue({ data: payload });

    const params = {
      query: 'coffee',
      locationBias: { latitude: 37.5, longitude: -122.3, radius: 500 },
    };
    const first = await googlePlaces.search(params);
    const second = await googlePlaces.search(params);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(mockPlaces.searchText).toHaveBeenCalledTimes(1);
  });

  it('surfaces Google API errors when fetching details', async () => {
    mockPlaces.get.mockRejectedValue(new Error('API Error'));

    await expect(googlePlaces.getDetails({ placeId: 'bad-id', forceFresh: true })).rejects.toThrow(
      /API Error/,
    );
  });

  it('returns limited photo references via getPlacePhotos', async () => {
    mockPlaces.get.mockResolvedValue({
      data: {
        photos: [{ name: 'places/foo/photos/1' }, { name: 'places/foo/photos/2' }],
      },
    });

    const photos = await googlePlaces.getPhotos({ placeId: 'foo', limit: 1, forceFresh: true });
    expect(photos).toEqual(['places/foo/photos/1']);
    expect(mockPlaces.get).toHaveBeenCalledTimes(1);
  });

  it('buildPhotoMediaUrl includes api key and sizing params', () => {
    const url = buildPhotoMediaUrl({
      key: 'test-key',
      pathname: 'places/foo/photos/1',
      maxWidthPx: 800,
      maxHeightPx: 600,
    });

    expect(url).toContain('places/foo/photos/1/media');
    expect(url).toContain('maxWidthPx=800');
    expect(url).toContain('maxHeightPx=600');
    expect(url).toContain('key=test-key');
  });
});
