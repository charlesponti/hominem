import { useApiClient } from '@hominem/rpc/react';
import type { TaskDetailOutput, TaskListItem } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from './query-keys';

interface UseTaskDeleteOptions {
  parentId?: string;
}

export function useTaskDelete({ parentId }: UseTaskDeleteOptions = {}) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await client.api.tasks[':id'].$delete({ param: { id: taskId } });
      return res.json();
    },
    onSuccess: (_deletedTask, taskId) => {
      queryClient.setQueryData<TaskListItem[] | undefined>(
        taskKeys.all,
        (current: TaskListItem[] | undefined) => current?.filter((task) => task.id !== taskId),
      );
      queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) });

      if (parentId) {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(parentId),
          (current: TaskDetailOutput | undefined) =>
            current
              ? { ...current, children: current.children.filter((child) => child.id !== taskId) }
              : current,
        );
        queryClient.setQueryData<TaskListItem[] | undefined>(
          taskKeys.all,
          (current: TaskListItem[] | undefined) =>
            current?.map((task) =>
              task.id === parentId
                ? { ...task, childCount: Math.max(0, (task.childCount ?? 0) - 1) }
                : task,
            ),
        );
      }
    },
  });
}
