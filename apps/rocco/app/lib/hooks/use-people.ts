import type { HonoClient } from '@hominem/hono-client';
import type {
  PeopleListOutput,
  PeopleCreateInput,
  PeopleCreateOutput,
} from '@hominem/hono-rpc/types';
import type { ApiResult } from '@hominem/services';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Get all people/contacts
 */
export const usePeople = () =>
  useHonoQuery<ApiResult<PeopleListOutput>>(['people', 'list'], async (client: HonoClient) => {
    const res = await client.api.people.list.$post({ json: {} });
    return res.json() as Promise<ApiResult<PeopleListOutput>>;
  });

/**
 * Create person/contact
 */
export const useCreatePerson = () => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<PeopleCreateOutput>, PeopleCreateInput>(
    async (client: HonoClient, variables: PeopleCreateInput) => {
      const res = await client.api.people.create.$post({ json: variables });
      return res.json() as Promise<ApiResult<PeopleCreateOutput>>;
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          utils.invalidate(['people', 'list']);
        }
      },
    },
  );
};
