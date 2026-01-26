/**
 * Centralized query key factory for Hono RPC
 * Replaces tRPC's automatic query key generation
 */

export const queryKeys = {
  lists: {
    all: () => ['lists'] as const,
    get: (id: string) => ['lists', 'get', id] as const,
    containing: (placeId?: string, googleMapsId?: string) =>
      ['lists', 'containing', placeId, googleMapsId] as const,
  },
  places: {
    all: () => ['places'] as const,
    get: (id: string) => ['places', 'get', id] as const,
    getByGoogleId: (id: string) => ['places', 'get-by-google-id', id] as const,
    autocomplete: (query: string, lat?: number, lng?: number) =>
      ['places', 'autocomplete', query, lat, lng] as const,
    nearby: (lat?: number, lng?: number, radius?: number) =>
      ['places', 'nearby', lat, lng, radius] as const,
    myVisits: (input?: any) => ['places', 'my-visits', input] as const,
    placeVisits: (placeId: string) => ['places', 'place-visits', placeId] as const,
    visitStats: (placeId: string) => ['places', 'visit-stats', placeId] as const,
  },
  invites: {
    received: (token?: string) => ['invites', 'received', token] as const,
    sent: () => ['invites', 'sent'] as const,
    byList: (listId: string) => ['invites', 'byList', listId] as const,
  },
  trips: {
    all: () => ['trips', 'all'] as const,
    get: (id: string) => ['trips', 'get', id] as const,
  },
  people: {
    list: () => ['people', 'list'] as const,
  },
};
