import { useAuthContext } from '@hominem/auth';
import type { ClientConfig } from '@hominem/rpc';
import { HonoProvider as BaseHonoProvider } from '@hominem/rpc/react';
import type { ReactNode } from 'react';

import { getQueryClient } from '~/lib/get-query-client';

interface HonoProviderProps {
  children: ReactNode;
  baseUrl: string;
}

export function HonoProvider({ children, baseUrl }: HonoProviderProps) {
  const { session } = useAuthContext();
  const config: ClientConfig = {
    baseUrl,
    getAuthToken: async () => session?.access_token ?? null,
    onError: () => {
      // Errors are handled via React Query's error state
    },
  };

  return (
    <BaseHonoProvider queryClient={getQueryClient()} config={config}>
      {children}
    </BaseHonoProvider>
  );
}
