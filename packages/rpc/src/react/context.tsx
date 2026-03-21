import { createContext, useContext } from 'react';

import type { ApiClient } from '../core/api-client';

export const HonoClientContext = createContext<ApiClient | null>(null);

export function useApiClient(): ApiClient {
  const client = useContext(HonoClientContext);
  if (!client) {
    throw new Error('useHonoClient must be used within HonoProvider');
  }
  return client;
}

export const useHonoClient = useApiClient;
