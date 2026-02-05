import { createContext, useContext } from 'react';

import type { HonoClient } from '../core/client';

export const HonoClientContext = createContext<HonoClient | null>(null);

export function useHonoClient(): HonoClient {
  const client = useContext(HonoClientContext);
  if (!client) {
    throw new Error('useHonoClient must be used within HonoProvider');
  }
  return client;
}
