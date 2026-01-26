import type {
  InvitesCreateInput,
  InvitesAcceptInput,
  InvitesDeclineInput,
  InvitesDeleteInput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Get received invites
 */
export const useReceivedInvites = (token?: string) =>
  useHonoQuery(
    ['invites', 'received', token],
    async (client) => {
      const res = await client.api.invites.received.$post({ json: { token } });
      return res.json();
    },
  );

/**
 * Get sent invites
 */
export const useSentInvites = () =>
  useHonoQuery(['invites', 'sent'], async (client) => {
    const res = await client.api.invites.sent.$post({ json: {} });
    return res.json();
  });

/**
 * Get invites for a specific list
 */
export const useListInvites = (listId: string | undefined) =>
  useHonoQuery(
    ['invites', 'by-list', listId],
    async (client) => {
      if (!listId) return { success: true, data: [] };
      const res = await client.api.invites['by-list'].$post({ json: { listId } });
      return await res.json();
    },
    {
      enabled: !!listId,
    },
  );

/**
 * Create invite
 */
export const useCreateInvite = () => {
  const utils = useHonoUtils();
  return useHonoMutation(
    async (client, variables: InvitesCreateInput) => {
      const res = await client.api.invites.create.$post({ json: variables });
      return await res.json();
    },
    {
      onSuccess: (result, variables) => {
        if (result.success) {
          utils.invalidate(['invites', 'sent']);
          utils.invalidate(['invites', 'by-list', variables.listId]);
        }
      },
    },
  );
};

/**
 * Accept invite
 */
export const useAcceptInvite = () => {
  const utils = useHonoUtils();
  return useHonoMutation(
    async (client, variables: InvitesAcceptInput) => {
      const res = await client.api.invites.accept.$post({ json: variables });
      return await res.json();
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          utils.invalidate(['invites', 'received']);
          utils.invalidate(['lists']);
        }
      },
    },
  );
};

/**
 * Decline invite
 */
export const useDeclineInvite = () => {
  const utils = useHonoUtils();
  return useHonoMutation(
    async (client, variables: InvitesDeclineInput) => {
      const res = await client.api.invites.decline.$post({ json: variables });
      return await res.json();
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          utils.invalidate(['invites', 'received']);
        }
      },
    },
  );
};

/**
 * Delete invite (revoke sent invite)
 */
export const useDeleteInvite = () => {
  const utils = useHonoUtils();
  return useHonoMutation(
    async (client, variables: InvitesDeleteInput) => {
      const res = await client.api.invites.delete.$post({ json: variables });
      return await res.json();
    },
    {
      onSuccess: (result, variables) => {
        if (result.success) {
          utils.invalidate(['invites', 'sent']);
          utils.invalidate(['invites', 'by-list', variables.listId]);
        }
      },
    },
  );
};
