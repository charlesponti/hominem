import type { TaskPriority, TaskStatus } from '@hominem/db/schema/tasks';
import type { HonoClient } from '@hominem/hono-client';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TasksListOutput {
  tasks: Task[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
}

export function useTasksList() {
  return useHonoQuery<TasksListOutput>(
    ['tasks', 'list'],
    async (client: HonoClient) => {
      const res = await client.api.tasks.$get();
      return res.json();
    },
    {
      staleTime: 1000 * 60 * 1, // 1 minute
    },
  );
}

export function useCreateTask() {
  const utils = useHonoUtils();

  return useHonoMutation<Task, CreateTaskInput>(
    async (client: HonoClient, variables: CreateTaskInput) => {
      const res = await client.api.tasks.$post({
        json: variables,
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['tasks', 'list']);
      },
    },
  );
}

export function useUpdateTask() {
  const utils = useHonoUtils();

  return useHonoMutation<Task, { id: string } & Partial<CreateTaskInput>>(
    async (client: HonoClient, variables: { id: string } & Partial<CreateTaskInput>) => {
      const { id, ...data } = variables;
      const res = await client.api.tasks[':id'].$patch({
        param: { id },
        json: data,
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['tasks', 'list']);
      },
    },
  );
}

export function useUpdateTaskStatus() {
  const utils = useHonoUtils();

  return useHonoMutation<Task, { id: string; status: TaskStatus }>(
    async (client: HonoClient, variables: { id: string; status: TaskStatus }) => {
      const { id, status } = variables;
      const res = await client.api.tasks[':id'].status.$post({
        param: { id },
        json: { status },
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['tasks', 'list']);
      },
    },
  );
}

export function useDeleteTask() {
  const utils = useHonoUtils();

  return useHonoMutation<Task, { id: string }>(
    async (client: HonoClient, variables: { id: string }) => {
      const res = await client.api.tasks[':id'].$delete({
        param: { id: variables.id },
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['tasks', 'list']);
      },
    },
  );
}
