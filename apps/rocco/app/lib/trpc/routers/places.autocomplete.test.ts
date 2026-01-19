import { describe, expect, it, vi, beforeEach } from 'vitest';

import { router, t } from '../context';
import { autocomplete } from './places.autocomplete';

// Mock @hominem/places-services
vi.mock('@hominem/places-services', () => ({
  googlePlaces: {
    search: vi.fn(),
  },
}));

import { googlePlaces } from '@hominem/places-services';

const appRouter = router({
  autocomplete,
});

const createCaller = t.createCallerFactory(appRouter);

describe('places.autocomplete procedure', () => {
  const mockContext = {
    user: { id: 'user-1' } as any,
    queues: {} as any,
    responseHeaders: new Headers(),
  };

  const caller = createCaller(mockContext);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return predictions for a valid query', async () => {
    const mockGooglePlaces = [
      {
        id: 'p1',
        displayName: { text: 'Coffee Shop' },
        formattedAddress: '123 Coffee St',
        location: { latitude: 10, longitude: 20 },
      },
    ];

    vi.mocked(googlePlaces.search).mockResolvedValue(mockGooglePlaces);

    const result = await caller.autocomplete({ query: 'coffee' });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        place_id: 'p1',
        text: 'Coffee Shop',
        address: '123 Coffee St',
      }),
    );
    expect(googlePlaces.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'coffee',
      }),
    );
  });

  it('should pass locationBias if provided', async () => {
    vi.mocked(googlePlaces.search).mockResolvedValue([]);

    await caller.autocomplete({
      query: 'coffee',
      latitude: 10,
      longitude: 20,
      radius: 1000,
    });

    expect(googlePlaces.search).toHaveBeenCalledWith(
      expect.objectContaining({
        locationBias: {
          latitude: 10,
          longitude: 20,
          radius: 1000,
        },
      }),
    );
  });

  it('should throw Zod error if query is too short', async () => {
    await expect(caller.autocomplete({ query: 'a' })).rejects.toThrow();
    expect(googlePlaces.search).not.toHaveBeenCalled();
  });

  it('should throw error if googlePlaces search fails', async () => {
    vi.mocked(googlePlaces.search).mockRejectedValue(new Error('Google API Error'));

    await expect(caller.autocomplete({ query: 'coffee' })).rejects.toThrow(
      'Failed to fetch autocomplete suggestions',
    );
  });
});
