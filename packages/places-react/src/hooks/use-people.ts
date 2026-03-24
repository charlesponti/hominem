import { useRpcMutation, useRpcQuery } from '@hominem/rpc/react';
import type {
  PeopleListOutput,
  PeopleCreateInput,
  PeopleCreateOutput,
} from '@hominem/rpc/types/people.types';
import { useQueryClient } from '@tanstack/react-query';

const queryKeys = {
  people: {
    list: () => ['people', 'list'] as const,
  },
};

/**
 * Get all people/contacts
 */
export const usePeople = () =>
  useRpcQuery<PeopleListOutput>(
    async () => {
      return [] as PeopleListOutput;
    },
    { queryKey: queryKeys.people.list() },
  );

/**
 * Create person/contact
 */
export const useCreatePerson = () => {
  const queryClient = useQueryClient();
  return useRpcMutation<PeopleCreateOutput, PeopleCreateInput>(
    async (_client, variables: PeopleCreateInput) => {
      const now = new Date().toISOString();
      return {
        id: `temp-person-${Date.now()}`,
        userId: '00000000-0000-0000-0000-000000000000',
        firstName: variables.firstName,
        lastName: variables.lastName ?? null,
        email: variables.email ?? null,
        phone: variables.phone ?? null,
        linkedinUrl: null,
        title: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      };
    },
    {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.people.list() });
        const previousPeople = queryClient.getQueryData<PeopleListOutput>(queryKeys.people.list());
        const now = new Date().toISOString();
        const optimisticPerson: PeopleCreateOutput = {
          id: `temp-person-${Date.now()}`,
          userId: '00000000-0000-0000-0000-000000000000',
          firstName: variables.firstName,
          lastName: variables.lastName ?? null,
          email: variables.email ?? null,
          phone: variables.phone ?? null,
          linkedinUrl: null,
          title: null,
          notes: null,
          createdAt: now,
          updatedAt: now,
        };

        queryClient.setQueryData<PeopleListOutput>(queryKeys.people.list(), (old) => {
          const existing = old ?? [];
          return [optimisticPerson, ...existing];
        });

        return { previousPeople, optimisticId: optimisticPerson.id };
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.people.list() });
      },
      onError: (error, variables, context) => {
        void variables;
        const previousPeople =
          typeof context === 'object' && context !== null && 'previousPeople' in context
            ? (context as { previousPeople?: PeopleListOutput }).previousPeople
            : undefined;

        if (previousPeople) {
          queryClient.setQueryData<PeopleListOutput>(queryKeys.people.list(), previousPeople);
        }

        console.error('Failed to create person:', error);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.people.list() });
      },
    },
  );
};
