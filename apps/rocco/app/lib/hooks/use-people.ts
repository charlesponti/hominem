import type {
  PeopleListOutput,
  PeopleCreateInput,
  PeopleCreateOutput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client';

/**
 * Get all people/contacts
 */
export const usePeople = () =>
  useHonoQuery<PeopleListOutput>(['people', 'list'], async (client) => {
    const res = await client.api.people.list.$post({ json: {} });
    return res.json();
  });

/**
 * Create person/contact
 */
export const useCreatePerson = () => {
  const utils = useHonoUtils();
  return useHonoMutation<PeopleCreateOutput, PeopleCreateInput>(
    async (client, variables) => {
      const res = await client.api.people.create.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['people', 'list']);
      },
    },
  );
};
