import type { ClientConfig } from '@hominem/hono-client';
import { HonoProvider as BaseHonoProvider } from '@hominem/hono-client/react';
import type { ReactNode } from 'react';

import { useAuth } from './auth-provider';
import { API_BASE_URL } from './constants';

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const { getAuthHeaders } = useAuth();
  const config: ClientConfig = {
    baseUrl: API_BASE_URL,
    getAuthToken: async () => null,
    getHeaders: getAuthHeaders,
    onError: (error: Error) => {
      console.error('Mobile Hono RPC Error', error);
    },
  };

  return <BaseHonoProvider config={config}>{children}</BaseHonoProvider>;
};
