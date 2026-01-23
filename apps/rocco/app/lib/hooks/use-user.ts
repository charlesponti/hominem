import type { UserDeleteAccountOutput } from '@hominem/hono-rpc/types';

import { useHonoMutation } from '@hominem/hono-client';

/**
 * Delete user account
 */
export const useDeleteAccount = () =>
  useHonoMutation<UserDeleteAccountOutput, {}>(async (client) => {
    const res = await client.api.user['delete-account'].$post({ json: {} });
    return res.json();
  });
