import type {
  AccountCreateInput,
  AccountCreateOutput,
  AccountUpdateInput,
  AccountUpdateOutput,
  AccountDeleteInput,
  AccountDeleteOutput,
} from '@hominem/hono-rpc/types/finance.types';
import type { ApiResult } from '@hominem/services';

import { useHonoMutation, useHonoUtils } from '~/lib/hono';

export const useCreateAccount = () => {
  const utils = useHonoUtils();

  return useHonoMutation<ApiResult<AccountCreateOutput>, AccountCreateInput>(
    async (client, variables) => {
      const res = await client.api.finance.accounts.create.$post({
        json: variables,
      });
      return res.json() as Promise<ApiResult<AccountCreateOutput>>;
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          utils.invalidate(['finance', 'accounts']);
        }
      },
    },
  );
};

export const useUpdateAccount = () => {
  const utils = useHonoUtils();

  return useHonoMutation<ApiResult<AccountUpdateOutput>, AccountUpdateInput>(
    async (client, variables) => {
      const res = await client.api.finance.accounts.update.$post({
        json: variables,
      });
      return res.json() as Promise<ApiResult<AccountUpdateOutput>>;
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          utils.invalidate(['finance', 'accounts']);
        }
      },
    },
  );
};

export const useDeleteAccount = () => {
  const utils = useHonoUtils();

  return useHonoMutation<ApiResult<AccountDeleteOutput>, AccountDeleteInput>(
    async (client, variables) => {
      const res = await client.api.finance.accounts.delete.$post({
        json: variables,
      });
      return res.json() as Promise<ApiResult<AccountDeleteOutput>>;
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          utils.invalidate(['finance', 'accounts']);
        }
      },
    },
  );
};
