import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useDebouncedValue } from '~/hooks/use-debounced-value';

export interface PersonPickerRecord {
  id: string;
  displayName: string;
  email: string | null;
}

const peopleKeys = {
  all: ['people'] as const,
  search: (query: string) => ['people', 'search', query] as const,
};

export function usePeopleSearch(query: string) {
  const client = useApiClient();
  const debouncedQuery = useDebouncedValue(query.trim(), 200);

  return useQuery<{ people: PersonPickerRecord[]; count: number }>({
    enabled: debouncedQuery.length > 0,
    queryKey: peopleKeys.search(debouncedQuery),
    queryFn: async () => {
      const response = await client.api.people.$get({
        query: { limit: '10', query: debouncedQuery },
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
