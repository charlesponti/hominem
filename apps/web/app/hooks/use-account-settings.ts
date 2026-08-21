import { useApiClient } from '@hominem/rpc/react';
import type { Chat } from '@hominem/rpc/types';
import type { MonthlyUsageStatus } from '@hominem/rpc/types';
import { useMutation, useQuery } from '@tanstack/react-query';

import { authClient } from '~/lib/auth-client';
import { chatQueryKeys } from '~/lib/query-keys';

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function useMonthlyUsage() {
  const client = useApiClient();

  return useQuery<MonthlyUsageStatus>({
    queryKey: ['usage', 'monthly'],
    queryFn: () => client.api.usage.monthly.$get().then((response) => response.json()),
  });
}

export function useArchivedChats() {
  const client = useApiClient();

  return useQuery<Chat[]>({
    queryKey: [...chatQueryKeys.list, 'archived'],
    queryFn: async () => {
      const response = await client.api.chats.$get({ query: { includeArchived: 'true' } });
      const chats = await response.json();
      const cutoff = Date.now() - MONTH_MS;

      return chats
        .filter((chat) => chat.archivedAt && Date.parse(chat.updatedAt ?? chat.createdAt) >= cutoff)
        .sort(
          (a, b) => Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt),
        );
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (name: string) => {
      const result = await authClient.updateUser({ name });
      if (result.error) {
        throw new Error(result.error.message ?? 'Could not save name.');
      }
    },
  });
}
