import { useApiClient } from '@hominem/rpc/react';
import type { Task, TaskDetailOutput, TaskListItem } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from './query-keys';

interface UseTaskUpdateOptions {
  parentId?: string;
}

interface UpdateTaskInput {
  taskId: string;
  title?: string;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high';
  dueAt?: string | null;
  durationMinutes?: number | null;
  schedulingWindowStartAt?: string | null;
  schedulingWindowEndAt?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  timeZone?: string | null;
  location?: string | null;
  participants?: { displayName: string; email?: string | null }[];
}

function applyPatch<T extends Task>(task: T, patch: UpdateTaskInput): T {
  return {
    ...task,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt } : {}),
    ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
    ...(patch.schedulingWindowStartAt !== undefined
      ? { schedulingWindowStartAt: patch.schedulingWindowStartAt }
      : {}),
    ...(patch.schedulingWindowEndAt !== undefined
      ? { schedulingWindowEndAt: patch.schedulingWindowEndAt }
      : {}),
    ...(patch.scheduledStartAt !== undefined ? { scheduledStartAt: patch.scheduledStartAt } : {}),
    ...(patch.scheduledEndAt !== undefined ? { scheduledEndAt: patch.scheduledEndAt } : {}),
    ...(patch.timeZone !== undefined ? { timeZone: patch.timeZone } : {}),
    ...(patch.location !== undefined ? { location: patch.location } : {}),
  };
}

export function useTaskUpdate({ parentId }: UseTaskUpdateOptions = {}) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, ...patch }: UpdateTaskInput) => {
      const res = await client.api.tasks[':id'].$patch({
        param: { id: taskId },
        json: patch,
      });
      return res.json();
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const previousAll = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
      const previousDetail = queryClient.getQueryData<TaskDetailOutput>(
        taskKeys.detail(input.taskId),
      );
      const previousParentDetail = parentId
        ? queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail(parentId))
        : undefined;

      queryClient.setQueryData<TaskListItem[] | undefined>(
        taskKeys.all,
        (current: TaskListItem[] | undefined) =>
          current?.map((task) => (task.id === input.taskId ? applyPatch(task, input) : task)),
      );

      if (parentId) {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(parentId),
          (current: TaskDetailOutput | undefined) =>
            current
              ? {
                  ...current,
                  children: current.children.map((child) =>
                    child.id === input.taskId ? applyPatch(child, input) : child,
                  ),
                }
              : current,
        );
      } else {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(input.taskId),
          (current: TaskDetailOutput | undefined) =>
            current ? { ...current, task: applyPatch(current.task, input) } : current,
        );
      }

      return { previousAll, previousDetail, previousParentDetail };
    },
    onError: (_error, input, context) => {
      if (!context) return;
      queryClient.setQueryData(taskKeys.all, context.previousAll);
      queryClient.setQueryData(taskKeys.detail(input.taskId), context.previousDetail);
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
    },
  });
}
