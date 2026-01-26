import type { HonoClient } from '@hominem/hono-client';
import type { UserDeleteAccountOutput } from '@hominem/hono-rpc/types';
import type { ApiResult } from '@hominem/services';

import { useHonoMutation } from '@hominem/hono-client/react';

/**
 * Delete user account
 */
export const useDeleteAccount = (options?: any) =>
  useHonoMutation<ApiResult<UserDeleteAccountOutput>, {}>(async (client: HonoClient) => {
    const res = await client.api.user['delete-account'].$post({ json: {} });
    return res.json() as Promise<ApiResult<UserDeleteAccountOutput>>;
  }, options);
