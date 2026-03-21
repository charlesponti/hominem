import type { ClientConfig } from '@hominem/rpc';
import { HonoProvider as BaseHonoProvider } from '@hominem/rpc/react';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useAuth } from './auth-provider';
import { API_BASE_URL } from './constants';

export const ApiProvider = ({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient?: QueryClient;
}) => {
  const { getAuthHeaders } = useAuth();
  const config: ClientConfig = {
    baseUrl: API_BASE_URL,
    getAuthToken: async () => null,
    getHeaders: getAuthHeaders,
    onError: (error: Error) => {
      console.error('Mobile Hono RPC Error', error);
    },
  };

  return (
    <BaseHonoProvider config={config} queryClient={queryClient}>
      {children}
    </BaseHonoProvider>
  );
};
