import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface PersonPickerRecord {
  id: string;
  displayName: string;
  email: string | null;
}

export const peopleKeys = {
  all: ['people'] as const,
  search: (query: string) => ['people', 'search', query] as const,
};

export function usePeopleSearch(query: string) {
  const client = useApiClient();

  return useQuery<{ people: PersonPickerRecord[]; count: number }>({
    enabled: query.trim().length > 0,
    queryKey: peopleKeys.search(query.trim()),
    queryFn: async () => {
      const response = await client.api.people.$get({
        query: { limit: '10', query: query.trim() },
      });
      return response.json();
    },
  });
}

export function useCreatePerson() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { displayName: string; email?: string | null }) => {
      const response = await client.api.people.$post({ json: input });
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
  });
}
