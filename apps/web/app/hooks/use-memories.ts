import { useApiClient } from '@hominem/rpc/react';
import type {
  MemoriesListOutput,
  MemoryDeleteOutput,
  MemoryUpdateInput,
  MemoryUpdateOutput,
} from '@hominem/rpc/types/memory.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const memoriesQueryKey = ['memories', 'list'] as const;

export function useMemories() {
  const client = useApiClient();

  return useQuery({
    queryKey: memoriesQueryKey,
    queryFn: async () => {
      const res = await client.api.memory.$get({ query: {} });
      const data = (await res.json()) as MemoriesListOutput;
      return data.memories;
    },
  });
}

export function useUpdateMemory() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<MemoryUpdateOutput, Error, { id: string } & MemoryUpdateInput>({
    mutationFn: async (variables) => {
      const { id, ...fields } = variables;
      const res = await client.api.memory[':id'].$patch({
        param: { id },
        json: fields,
      });
      return res.json() as Promise<MemoryUpdateOutput>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoriesQueryKey });
    },
  });
}

export function useDeleteMemory() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<MemoryDeleteOutput, Error, { id: string }>({
    mutationFn: async (variables) => {
      const res = await client.api.memory[':id'].$delete({ param: { id: variables.id } });
      return res.json() as Promise<MemoryDeleteOutput>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoriesQueryKey });
    },
  });
}
