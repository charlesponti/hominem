import { useApiClient } from '@hominem/rpc/react';
import type { Task } from '@hominem/rpc/types';

import { useTaskPatchMutation } from './use-task-patch-mutation';

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
  participants?: string[];
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

  return useTaskPatchMutation<UpdateTaskInput>({
    parentId,
    mutationFn: async ({ taskId, ...patch }) => {
      const res = await client.api.tasks[':id'].$patch({
        param: { id: taskId },
        json: patch,
      });
      return res.json();
    },
    getTaskId: (input) => input.taskId,
    applyOptimistic: applyPatch,
    alwaysUpdateOwnDetailOnSuccess: true,
  });
}
