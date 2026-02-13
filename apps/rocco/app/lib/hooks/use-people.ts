import type { HonoClient } from '@hominem/hono-client';
import type {
  PeopleListOutput,
  PeopleCreateInput,
  PeopleCreateOutput,
} from '@hominem/hono-rpc/types/people.types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

import { queryKeys } from '~/lib/query-keys';

/**
 * Get all people/contacts
 */
export const usePeople = () =>
  useHonoQuery<PeopleListOutput>(queryKeys.people.list(), async (client: HonoClient) => {
    const res = await client.api.people.list.$post({ json: {} });
    return res.json() as Promise<PeopleListOutput>;
  });

/**
 * Create person/contact
 */
export const useCreatePerson = () => {
  const utils = useHonoUtils();
  return useHonoMutation<PeopleCreateOutput, PeopleCreateInput>(
    async (client: HonoClient, variables: PeopleCreateInput) => {
      const res = await client.api.people.create.$post({ json: variables });
      return res.json() as Promise<PeopleCreateOutput>;
    },
    {
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.people.list());
        const previousPeople = utils.getData<PeopleListOutput>(queryKeys.people.list());
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

        utils.setData<PeopleListOutput>(queryKeys.people.list(), (old) => {
          const existing = old ?? [];
          return [optimisticPerson, ...existing];
        });

        return { previousPeople, optimisticId: optimisticPerson.id };
      },
      onSuccess: (_result) => {
        utils.invalidate(queryKeys.people.list());
      },
      onError: (error, _variables, context) => {
        const previousPeople =
          typeof context === 'object' &&
          context !== null &&
          'previousPeople' in context
            ? (context as { previousPeople?: PeopleListOutput }).previousPeople
            : undefined;

        if (previousPeople) {
          utils.setData<PeopleListOutput>(queryKeys.people.list(), previousPeople);
        }

        console.error('Failed to create person:', error);
      },
      onSettled: () => {
        utils.invalidate(queryKeys.people.list());
      },
    },
  );
};
