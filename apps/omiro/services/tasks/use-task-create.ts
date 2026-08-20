import { useApiClient } from '@hominem/rpc/react';
import type { Task, TaskDetailOutput, TaskListItem } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from './query-keys';

interface UseTaskCreateOptions {
  parentId?: string;
}

interface CreateTaskInput {
  title: string;
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
  participants?: string[];
  parentTaskId?: string | null;
}

function buildCreateTaskPayload(input: CreateTaskInput, parentId: string | undefined) {
  return {
    title: input.title.trim(),
    description: input.description ?? null,
    artifactType: 'task' as const,
    priority: input.priority ?? 'medium',
    dueAt: input.dueAt ?? null,
    durationMinutes: input.durationMinutes ?? null,
    schedulingWindowStartAt: input.schedulingWindowStartAt ?? null,
    schedulingWindowEndAt: input.schedulingWindowEndAt ?? null,
    scheduledStartAt: input.scheduledStartAt ?? null,
    scheduledEndAt: input.scheduledEndAt ?? null,
    timeZone: input.timeZone ?? null,
    location: input.location ?? null,
    participants: input.participants,
    parentTaskId: parentId ?? input.parentTaskId ?? null,
  };
}

function buildOptimisticTask(
  payload: ReturnType<typeof buildCreateTaskPayload>,
  optimisticId: string,
): Task {
  const now = new Date().toISOString();

  return {
    id: optimisticId,
    ownerUserId: '',
    title: payload.title,
    description: payload.description,
    parentTaskId: payload.parentTaskId,
    status: 'pending',
    priority: payload.priority,
    dueAt: payload.dueAt,
    durationMinutes: payload.durationMinutes,
    schedulingWindowStartAt: payload.schedulingWindowStartAt,
    schedulingWindowEndAt: payload.schedulingWindowEndAt,
    scheduledStartAt: payload.scheduledStartAt,
    scheduledEndAt: payload.scheduledEndAt,
    timeZone: payload.timeZone,
    location: payload.location,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    artifactType: 'task',
  };
}

export function useTaskCreate({ parentId }: UseTaskCreateOptions = {}) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const res = await client.api.tasks.$post({
        json: buildCreateTaskPayload(input, parentId),
      });
      return res.json();
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });

      const optimisticId = `optimistic-task-${Date.now().toString()}`;
      const optimisticTask = buildOptimisticTask(
        buildCreateTaskPayload(input, parentId),
        optimisticId,
      );

      const previousAll = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
      const previousDetail = parentId
        ? queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail(parentId))
        : undefined;

      if (parentId) {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(parentId),
          (current: TaskDetailOutput | undefined) =>
            current ? { ...current, children: [...current.children, optimisticTask] } : current,
        );
        queryClient.setQueryData<TaskListItem[] | undefined>(
          taskKeys.all,
          (current: TaskListItem[] | undefined) =>
            current?.map((task) =>
              task.id === parentId ? { ...task, childCount: (task.childCount ?? 0) + 1 } : task,
            ),
        );
      } else {
        queryClient.setQueryData<TaskListItem[] | undefined>(
          taskKeys.all,
          (current: TaskListItem[] | undefined) => [
            { ...optimisticTask, childCount: 0 },
            ...(current ?? []),
          ],
        );
      }

      return { optimisticId, previousAll, previousDetail };
    },
    onError: (_error, _input, context) => {
      if (!context) return;
      queryClient.setQueryData(taskKeys.all, context.previousAll);
      if (parentId) {
        queryClient.setQueryData(taskKeys.detail(parentId), context.previousDetail);
      }
    },
    onSuccess: (createdTask, _input, context) => {
      if (parentId) {
        queryClient.setQueryData<TaskDetailOutput | undefined>(
          taskKeys.detail(parentId),
          (current: TaskDetailOutput | undefined) =>
            current
              ? {
                  ...current,
                  children: current.children.map((child) =>
                    child.id === context?.optimisticId ? createdTask : child,
                  ),
                }
              : current,
        );
      } else {
        queryClient.setQueryData<TaskListItem[] | undefined>(
          taskKeys.all,
          (current: TaskListItem[] | undefined) =>
            current?.map((task) =>
              task.id === context?.optimisticId ? { ...createdTask, childCount: 0 } : task,
            ),
        );
        queryClient.setQueryData(taskKeys.detail(createdTask.id), {
          task: createdTask,
          participants: [],
          children: [],
        } satisfies TaskDetailOutput);
      }
    },
  });
}
