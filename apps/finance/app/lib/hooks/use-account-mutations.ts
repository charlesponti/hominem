import type {
  AccountCreateInput,
  AccountCreateOutput,
  AccountUpdateInput,
  AccountUpdateOutput,
  AccountDeleteInput,
  AccountDeleteOutput,
} from '@hominem/hono-rpc/types/finance.types';

import { useHonoMutation, useHonoUtils } from '~/lib/hono';

export const useCreateAccount = () => {
  const utils = useHonoUtils();

  return useHonoMutation(
    async (client, variables: AccountCreateInput) => {
      const res = await client.api.finance.accounts.create.$post({
        json: variables,
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'accounts']);
      },
    },
  );
};

export const useUpdateAccount = () => {
  const utils = useHonoUtils();

  return useHonoMutation(
    async (client, variables: AccountUpdateInput) => {
      const res = await client.api.finance.accounts.update.$post({
        json: variables,
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'accounts']);
      },
    },
  );
};

export const useDeleteAccount = () => {
  const utils = useHonoUtils();

  return useHonoMutation(
    async (client, variables: AccountDeleteInput) => {
      const res = await client.api.finance.accounts.delete.$post({
        json: variables,
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'accounts']);
      },
    },
  );
};
