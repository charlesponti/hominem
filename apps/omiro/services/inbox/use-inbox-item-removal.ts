import type { InboxStreamItem } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';

import { clearResumeTarget, readResumeTarget } from '~/services/navigation/launch-state';
import { inboxKeys } from '~/services/notes/query-keys';

import { removeInboxStreamItem } from './inbox-refresh';

interface UseInboxItemRemovalOptions {
  kind: InboxStreamItem['kind'];
  entityId: string;
}

interface InboxRemovalContext {
  previousInboxPages: [readonly unknown[], unknown][];
}

// Shared optimistic-removal skeleton for every mutation that drops an item
// out of the inbox stream (archive, delete, ...): snapshot every cached
// inbox page, remove the item right away, roll back on failure.
export function useInboxItemRemoval<TVariables = void>({
  kind,
  entityId,
}: UseInboxItemRemovalOptions) {
  const queryClient = useQueryClient();

  return {
    onMutate: async (_variables: TVariables): Promise<InboxRemovalContext> => {
      await queryClient.cancelQueries({ queryKey: inboxKeys.pages() });
      const previousInboxPages = queryClient.getQueriesData({ queryKey: inboxKeys.pages() });

      removeInboxStreamItem(queryClient, { kind, entityId });

      return { previousInboxPages };
    },
    onError: (
      _error: unknown,
      _variables: TVariables,
      context: InboxRemovalContext | undefined,
    ) => {
      context?.previousInboxPages.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    clearResumeTargetIfMatch: () => {
      if (readResumeTarget()?.id === entityId) {
        clearResumeTarget();
      }
    },
  };
}
