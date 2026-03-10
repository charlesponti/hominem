import { createPlacesClient, type PlacesClient } from '../domains/places';

import { createRawHonoClient, type RawHonoClient } from './raw-client';

export interface ClientConfig {
  baseUrl: string;
  getAuthToken: () => Promise<string | null>;
  onError?: (error: Error) => void;
}

export interface ApiClient {
  api: RawHonoClient['api'];
  places: PlacesClient;
}

export type HonoClient = ApiClient;
export type HonoClientInstance = RawHonoClient;

export function createApiClient(config: ClientConfig): ApiClient {
  const rawClient = createRawHonoClient(config);

  return {
    api: rawClient.api,
    places: createPlacesClient(rawClient),
  };
}

export const createHonoClient = createApiClient;
