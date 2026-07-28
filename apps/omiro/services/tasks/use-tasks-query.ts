import { useApiClient } from '@hominem/rpc/react';
import type { TaskListItem } from '@hominem/rpc/types';
import { useQuery } from '@tanstack/react-query';

import { taskKeys } from './query-keys';

export function useTasksQuery({ enabled = true }: { enabled?: boolean } = {}) {
  const client = useApiClient();

  return useQuery<TaskListItem[]>({
    queryKey: taskKeys.all,
    queryFn: async () => {
      const res = await client.api.tasks.$get();
      const { tasks } = await res.json();
      return tasks;
    },
    enabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
