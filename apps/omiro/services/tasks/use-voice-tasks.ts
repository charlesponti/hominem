import { useApiClient } from '@hominem/rpc/react';
import type { TaskDetailOutput, TaskListItem, TasksVoiceInput } from '@hominem/rpc/types';
import { TasksVoiceOutputSchema } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type * as z from 'zod';

import { taskKeys } from './query-keys';

type TasksVoiceOutput = z.infer<typeof TasksVoiceOutputSchema>;

export function useVoiceTasks() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TasksVoiceInput): Promise<TasksVoiceOutput> => {
      const res = await client.api.tasks.voice.$post({ json: input });
      if (!res.ok) {
        const error = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(
          typeof error.error === 'string'
            ? error.error
            : `Voice task creation failed (${res.status})`,
        );
      }
      return TasksVoiceOutputSchema.parse(await res.json());
    },
    onSuccess: ({ parent, tasks }: TasksVoiceOutput) => {
      if (tasks.length === 0) return;

      if (parent) {
        queryClient.setQueryData<TaskListItem[]>(taskKeys.all, (current) => [
          { ...parent, childCount: tasks.length },
          ...(current ?? []),
        ]);
        queryClient.setQueryData(taskKeys.detail(parent.id), {
          task: parent,
          participants: [],
          children: tasks,
        } satisfies TaskDetailOutput);
        for (const task of tasks) {
          queryClient.setQueryData(taskKeys.detail(task.id), {
            task,
            participants: [],
            children: [],
          } satisfies TaskDetailOutput);
        }
        return;
      }

      const [task] = tasks;
      queryClient.setQueryData<TaskListItem[]>(taskKeys.all, (current) => [
        { ...task, childCount: 0 },
        ...(current ?? []),
      ]);
      queryClient.setQueryData(taskKeys.detail(task.id), {
        task,
        participants: [],
        children: [],
      } satisfies TaskDetailOutput);
    },
  });
}
