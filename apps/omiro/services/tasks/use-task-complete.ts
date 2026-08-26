import { useApiClient } from '@hominem/rpc/react';
import type { Task } from '@hominem/rpc/types';

import { useTaskPatchMutation } from './use-task-patch-mutation';

interface UseTaskCompleteOptions {
  parentId?: string;
}

interface CompleteTaskInput {
  taskId: string;
  completed: boolean;
}

function applyCompleted<T extends Task>(task: T, { completed }: CompleteTaskInput): T {
  return {
    ...task,
    status: completed ? 'completed' : 'pending',
    completedAt: completed ? new Date().toISOString() : null,
  };
}

export function useTaskComplete({ parentId }: UseTaskCompleteOptions = {}) {
  const client = useApiClient();

  return useTaskPatchMutation<CompleteTaskInput>({
    parentId,
    mutationFn: async ({ taskId, completed }) => {
      const res = await client.api.tasks[':id'].complete.$patch({
        param: { id: taskId },
        json: { completed },
      });
      return res.json();
    },
    getTaskId: (input) => input.taskId,
    applyOptimistic: applyCompleted,
    alwaysUpdateOwnDetailOnSuccess: false,
  });
}
