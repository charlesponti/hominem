import type { HonoClient } from '@hominem/hono-client';
import type {
  PeopleListOutput,
  PeopleCreateInput,
  PeopleCreateOutput,
} from '@hominem/hono-rpc/types';

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
      onSuccess: (result) => {
        utils.invalidate(queryKeys.people.list());
      },
    },
  );
};
