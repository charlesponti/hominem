import type {
  InvitesGetReceivedInput,
  InvitesGetReceivedOutput,
  InvitesGetSentOutput,
  InvitesGetByListInput,
  InvitesGetByListOutput,
  InvitesCreateInput,
  InvitesCreateOutput,
  InvitesAcceptInput,
  InvitesAcceptOutput,
  InvitesDeclineInput,
  InvitesDeclineOutput,
  InvitesDeleteInput,
  InvitesDeleteOutput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client';

/**
 * Get received invites
 */
export const useReceivedInvites = (token?: string) =>
  useHonoQuery<InvitesGetReceivedOutput>(['invites', 'received', token], async (client) => {
    const res = await client.api.invites.received.$post({ json: { token } });
    return res.json();
  });

/**
 * Get sent invites
 */
export const useSentInvites = () =>
  useHonoQuery<InvitesGetSentOutput>(['invites', 'sent'], async (client) => {
    const res = await client.api.invites.sent.$post({ json: {} });
    return res.json();
  });

/**
 * Get invites for a specific list
 */
export const useListInvites = (listId: string | undefined) =>
  useHonoQuery<InvitesGetByListOutput>(
    ['invites', 'by-list', listId],
    async (client) => {
      if (!listId) return [];
      const res = await client.api.invites['by-list'].$post({ json: { listId } });
      return res.json();
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
  return useHonoMutation<InvitesCreateOutput, InvitesCreateInput>(
    async (client, variables) => {
      const res = await client.api.invites.create.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (_, variables) => {
        utils.invalidate(['invites', 'sent']);
        utils.invalidate(['invites', 'by-list', variables.listId]);
      },
    },
  );
};

/**
 * Accept invite
 */
export const useAcceptInvite = () => {
  const utils = useHonoUtils();
  return useHonoMutation<InvitesAcceptOutput, InvitesAcceptInput>(
    async (client, variables) => {
      const res = await client.api.invites.accept.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['invites', 'received']);
        utils.invalidate(['lists']);
      },
    },
  );
};

/**
 * Decline invite
 */
export const useDeclineInvite = () => {
  const utils = useHonoUtils();
  return useHonoMutation<InvitesDeclineOutput, InvitesDeclineInput>(
    async (client, variables) => {
      const res = await client.api.invites.decline.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['invites', 'received']);
      },
    },
  );
};

/**
 * Delete invite (revoke sent invite)
 */
export const useDeleteInvite = () => {
  const utils = useHonoUtils();
  return useHonoMutation<InvitesDeleteOutput, InvitesDeleteInput>(
    async (client, variables) => {
      const res = await client.api.invites.delete.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (_, variables) => {
        utils.invalidate(['invites', 'sent']);
        utils.invalidate(['invites', 'by-list', variables.listId]);
      },
    },
  );
};
