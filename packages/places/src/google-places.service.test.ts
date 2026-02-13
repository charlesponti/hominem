import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPlaces = {
  searchText: vi.fn(),
  get: vi.fn(),
};

const googleapi = {
  google: {
    places: vi.fn(() => ({
      places: mockPlaces,
    })),
  },
};

// Mock googleapis
vi.mock('googleapis', () => googleapi);

// Mock Redis
vi.mock('@hominem/services/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock logger
vi.mock('@hominem/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock env
vi.mock('@hominem/services/env', () => ({
  env: {
    GOOGLE_API_KEY: 'test-api-key',
  },
}));

let redis: typeof import('@hominem/services/redis').redis;
let googlePlaces: typeof import('./google-places.service').googlePlaces;
let getNeighborhoodFromAddressComponents: typeof import('./google-places.service').getNeighborhoodFromAddressComponents;
let googlePlacesTestUtils: typeof import('./google-places.service').googlePlacesTestUtils;

beforeAll(async () => {
  ({ redis } = await import('@hominem/services/redis'));
  ({ googlePlaces, getNeighborhoodFromAddressComponents, googlePlacesTestUtils } = await import(
    './google-places.service'
  ));
});

beforeEach(() => {
  googlePlacesTestUtils.setClient({
    places: mockPlaces,
  } as any);
  vi.clearAllMocks();
});

describe('googlePlaces', () => {
  describe('search', () => {
    const mockQuery = 'coffee shop';
    const mockPlacesList = [
      { id: 'place1', displayName: { text: 'Coffee 1' } },
      { id: 'place2', displayName: { text: 'Coffee 2' } },
    ];

    it('should return places from API and cache them', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      mockPlaces.searchText.mockResolvedValue({
        data: { places: mockPlacesList },
      });

      const results = await googlePlaces.search({ query: mockQuery });

      expect(results).toEqual(mockPlacesList);
      expect(mockPlaces.searchText).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({ textQuery: mockQuery }),
        }),
        expect.any(Object),
      );
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should return cached results if available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockPlacesList));

      const results = await googlePlaces.search({ query: mockQuery });

      expect(results).toEqual(mockPlacesList);
      expect(mockPlaces.searchText).not.toHaveBeenCalled();
    });

    it('should bypass cache when forceFresh is true', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([{ id: 'cached' }]));
      mockPlaces.searchText.mockResolvedValue({
        data: { places: mockPlacesList },
      });

      const results = await googlePlaces.search({ query: mockQuery, forceFresh: true });

      expect(results).toEqual(mockPlacesList);
      expect(mockPlaces.searchText).toHaveBeenCalled();
    });

    it('should fall back to API if Redis read fails', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'));
      mockPlaces.searchText.mockResolvedValue({
        data: { places: mockPlacesList },
      });

      const results = await googlePlaces.search({ query: mockQuery });

      expect(results).toEqual(mockPlacesList);
      expect(mockPlaces.searchText).toHaveBeenCalled();
    });

    it('should handle locationBias', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      mockPlaces.searchText.mockResolvedValue({ data: { places: [] } });

      const locationBias = { latitude: 10, longitude: 20, radius: 1000 };
      await googlePlaces.search({ query: mockQuery, locationBias });

      expect(mockPlaces.searchText).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            locationBias: {
              circle: {
                center: { latitude: 10, longitude: 20 },
                radius: 1000,
              },
            },
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('getDetails', () => {
    const mockPlaceId = 'place123';
    const mockPlaceDetails = { id: mockPlaceId, displayName: { text: 'A Place' } };

    it('should fetch place details and cache them', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      mockPlaces.get.mockResolvedValue({ data: mockPlaceDetails });

      const result = await googlePlaces.getDetails({ placeId: mockPlaceId });

      expect(result).toEqual(mockPlaceDetails);
      expect(mockPlaces.get).toHaveBeenCalledWith(
        { name: `places/${mockPlaceId}` },
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Goog-FieldMask': expect.any(String) }),
        }),
      );
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should return cached details if available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockPlaceDetails));

      const result = await googlePlaces.getDetails({ placeId: mockPlaceId });

      expect(result).toEqual(mockPlaceDetails);
      expect(mockPlaces.get).not.toHaveBeenCalled();
    });

    it('should throw error if place is not found', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      mockPlaces.get.mockResolvedValue({ data: null });

      await expect(googlePlaces.getDetails({ placeId: mockPlaceId })).rejects.toThrow(
        `Place ${mockPlaceId} not found`,
      );
    });
  });

  describe('getPhotos', () => {
    const mockPlaceId = 'place123';
    const mockPhotosResponse = {
      photos: [
        { name: 'places/place123/photos/photo1' },
        { name: 'places/place123/photos/photo2' },
      ],
    };

    it('should return photo names from place details', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockPhotosResponse));

      const results = await googlePlaces.getPhotos({ placeId: mockPlaceId });

      expect(results).toEqual(['places/place123/photos/photo1', 'places/place123/photos/photo2']);
    });

    it('should respect the limit', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockPhotosResponse));

      const results = await googlePlaces.getPhotos({ placeId: mockPlaceId, limit: 1 });

      expect(results).toHaveLength(1);
      expect(results[0]).toBe('places/place123/photos/photo1');
    });
  });
});

describe('getNeighborhoodFromAddressComponents', () => {
  it('should extract neighborhood from address components', () => {
    const components = [
      { longText: 'Manhattan', types: ['sublocality', 'sublocality_level_1'] },
      { longText: 'SoHo', types: ['neighborhood'] },
    ];

    const result = getNeighborhoodFromAddressComponents(components);
    expect(result).toBe('SoHo');
  });

  it('should return null if no neighborhood component is found', () => {
    const components = [{ longText: 'Manhattan', types: ['sublocality'] }];

    const result = getNeighborhoodFromAddressComponents(components);
    expect(result).toBeNull();
  });

  it('should return null if components are undefined', () => {
    const result = getNeighborhoodFromAddressComponents(undefined);
    expect(result).toBeNull();
  });
});

describe('googlePlacesTestUtils', () => {
  describe('clearCache', () => {
    it('should delete keys matching the google-places pattern', async () => {
      const mockKeys = ['google-places:key1', 'google-places:key2'];
      vi.mocked(redis.keys).mockResolvedValue(mockKeys);

      await googlePlacesTestUtils.clearCache();

      expect(redis.keys).toHaveBeenCalledWith('google-places:*');
      expect(redis.del).toHaveBeenCalledWith(...mockKeys);
    });

    it('should not call del if no keys are found', async () => {
      vi.mocked(redis.keys).mockResolvedValue([]);

      await googlePlacesTestUtils.clearCache();

      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
