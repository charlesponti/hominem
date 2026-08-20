import { useApiClient } from '@hominem/rpc/react';
import type { Task, TaskDetailOutput, TaskListItem } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from './query-keys';
import { mapTaskDetail, mapTaskList } from './task-cache';

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

      queryClient.setQueryData<TaskListItem[] | undefined>(taskKeys.all, (current) =>
        mapTaskList(current, taskId, (task) => applyCompleted(task, completed)),
      );

      if (parentId) {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(parentId),
          (current) => mapTaskDetail(current, taskId, (task) => applyCompleted(task, completed)),
        );
      } else {
        queryClient.setQueryData<TaskDetailOutput | undefined>(taskKeys.detail(taskId), (current) =>
          mapTaskDetail(current, taskId, (task) => applyCompleted(task, completed)),
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
      queryClient.setQueryData<TaskListItem[] | undefined>(taskKeys.all, (current) =>
        mapTaskList(current, updatedTask.id, (task) => ({ ...task, ...updatedTask })),
      );

      if (parentId) {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(parentId),
          (current) =>
            mapTaskDetail(current, updatedTask.id, (task) => ({ ...task, ...updatedTask })),
        );
      } else {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(updatedTask.id),
          (current) =>
            mapTaskDetail(current, updatedTask.id, (task) => ({ ...task, ...updatedTask })),
        );
      }
    },
  });
}
