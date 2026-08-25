import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type ProposedChatTask = { title: string; description?: string };

export function useExtractChatTasks() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<{ tasks: ProposedChatTask[] }, Error, { transcript: string }>({
    mutationFn: async ({ transcript }) => {
      const response = await client.api.tasks.extract.$post({ json: { transcript } });
      if (!response.ok) throw new Error('Task extraction failed.');
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCreateChatTasks() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<{ parent: unknown; tasks: unknown[] }, Error, { tasks: ProposedChatTask[] }>({
    mutationFn: async ({ tasks }) => {
      const response = await client.api.tasks.batch.$post({ json: { tasks } });
      if (!response.ok) throw new Error('Task creation failed.');
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
