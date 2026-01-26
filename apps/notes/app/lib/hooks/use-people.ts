import type { HonoClient } from '@hominem/hono-client';
import type {
  PeopleListOutput,
  PeopleCreateInput,
  PeopleCreateOutput,
  PeopleUpdateInput,
  PeopleUpdateOutput,
  PeopleDeleteInput,
  PeopleDeleteOutput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Get all people/contacts
 */
export const usePeople = () =>
  useHonoQuery<PeopleListOutput>(['people', 'list'], async (client: HonoClient) => {
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
      const res = await client.api.people.create.$post({
        json: variables,
      });
      return res.json() as Promise<PeopleCreateOutput>;
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

/**
 * Update person/contact
 */
export const useUpdatePerson = () => {
  const utils = useHonoUtils();
  return useHonoMutation<PeopleUpdateOutput, PeopleUpdateInput>(
    async (client: HonoClient, variables: PeopleUpdateInput) => {
      const { id, json } = variables;
      const res = await client.api.people[':id'].update.$post({
        param: { id },
        json,
      });
      return res.json() as Promise<PeopleUpdateOutput>;
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

/**
 * Delete person/contact
 */
export const useDeletePerson = () => {
  const utils = useHonoUtils();
  return useHonoMutation<PeopleDeleteOutput, PeopleDeleteInput>(
    async (client: HonoClient, variables: PeopleDeleteInput) => {
      const { id } = variables;
      const res = await client.api.people[':id'].delete.$post({
        param: { id },
      });
      return res.json() as Promise<PeopleDeleteOutput>;
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
