import { useApiClient } from '@hominem/rpc/react';
import type { Task, TaskDetailOutput, TaskListItem } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from './query-keys';

interface UseTaskCompleteOptions {
  parentId?: string;
}

function applyCompleted<T extends Task>(task: T, completed: boolean): T {
  return {
    ...task,
    status: completed ? 'completed' : 'pending',
    completedAt: completed ? new Date().toISOString() : null,
  };
}

export function useTaskComplete({ parentId }: UseTaskCompleteOptions = {}) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const res = await client.api.tasks[':id'].complete.$patch({
        param: { id: taskId },
        json: { completed },
      });
      return res.json();
    },
    onMutate: async ({ taskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousAll = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
      const previousDetail = queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail(taskId));
      const previousParentDetail = parentId
        ? queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail(parentId))
        : undefined;

      queryClient.setQueryData<TaskListItem[] | undefined>(
        taskKeys.all,
        (current: TaskListItem[] | undefined) =>
          current?.map((task) => (task.id === taskId ? applyCompleted(task, completed) : task)),
      );

      if (parentId) {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(parentId),
          (current: TaskDetailOutput | undefined) =>
            current
              ? {
                  ...current,
                  children: current.children.map((child) =>
                    child.id === taskId ? applyCompleted(child, completed) : child,
                  ),
                }
              : current,
        );
      } else {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(taskId),
          (current: TaskDetailOutput | undefined) =>
            current ? { ...current, task: applyCompleted(current.task, completed) } : current,
        );
      }

      return { previousAll, previousDetail, previousParentDetail };
    },
    onError: (_error, { taskId }, context) => {
      if (!context) return;
      queryClient.setQueryData(taskKeys.all, context.previousAll);
      queryClient.setQueryData(taskKeys.detail(taskId), context.previousDetail);
      if (parentId) {
        queryClient.setQueryData(taskKeys.detail(parentId), context.previousParentDetail);
      }
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<TaskListItem[] | undefined>(
        taskKeys.all,
        (current: TaskListItem[] | undefined) =>
          current?.map((task) => (task.id === updatedTask.id ? { ...task, ...updatedTask } : task)),
      );

      if (parentId) {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(parentId),
          (current: TaskDetailOutput | undefined) =>
            current
              ? {
                  ...current,
                  children: current.children.map((child) =>
                    child.id === updatedTask.id ? { ...child, ...updatedTask } : child,
                  ),
                }
              : current,
        );
      } else {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(updatedTask.id),
          (current: TaskDetailOutput | undefined) =>
            current ? { ...current, task: { ...current.task, ...updatedTask } } : current,
        );
      }
    },
  });
}
