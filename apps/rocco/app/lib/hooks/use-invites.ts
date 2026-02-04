import type {
  InvitesCreateInput,
  InvitesCreateOutput,
  InvitesAcceptInput,
  InvitesAcceptOutput,
  InvitesDeclineInput,
  InvitesDeclineOutput,
  InvitesDeleteInput,
  InvitesDeleteOutput,
  InvitesGetReceivedOutput,
  InvitesGetSentOutput,
  InvitesGetByListOutput,
} from '@hominem/hono-rpc/types/invites.types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

import { queryKeys } from '~/lib/query-keys';

/**
 * Get received invites
 */
export const useReceivedInvites = (token?: string) =>
  useHonoQuery<InvitesGetReceivedOutput>(queryKeys.invites.received(token), async (client) => {
    const res = await client.api.invites.received.$post({ json: { token } });
    return res.json() as Promise<InvitesGetReceivedOutput>;
  });

/**
 * Get sent invites
 */
export const useSentInvites = () =>
  useHonoQuery<InvitesGetSentOutput>(queryKeys.invites.sent(), async (client) => {
    const res = await client.api.invites.sent.$post({ json: {} });
    return res.json() as Promise<InvitesGetSentOutput>;
  });

/**
 * Get invites for a specific list
 */
export const useListInvites = (listId: string | undefined) =>
  useHonoQuery<InvitesGetByListOutput>(
    queryKeys.invites.byList(listId || ''),
    async (client) => {
      if (!listId) return [] as unknown as InvitesGetByListOutput;
      const res = await client.api.invites['by-list'].$post({ json: { listId } });
      return res.json() as Promise<InvitesGetByListOutput>;
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
    async (client, variables: InvitesCreateInput) => {
      const res = await client.api.invites.create.$post({ json: variables });
      return res.json() as Promise<InvitesCreateOutput>;
    },
    {
      onSuccess: (result, variables) => {
        utils.invalidate(queryKeys.invites.sent());
        utils.invalidate(queryKeys.invites.byList(variables.listId));
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
    async (client, variables: InvitesAcceptInput) => {
      const res = await client.api.invites.accept.$post({ json: variables });
      return res.json() as Promise<InvitesAcceptOutput>;
    },
    {
      onSuccess: (_result) => {
        utils.invalidate(queryKeys.invites.received());
        utils.invalidate(queryKeys.lists.all());
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
    async (client, variables: InvitesDeclineInput) => {
      const res = await client.api.invites.decline.$post({ json: variables });
      return res.json() as Promise<InvitesDeclineOutput>;
    },
    {
      onSuccess: (_result) => {
        utils.invalidate(queryKeys.invites.received());
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
    async (client, variables: InvitesDeleteInput) => {
      const res = await client.api.invites.delete.$post({ json: variables });
      return res.json() as Promise<InvitesDeleteOutput>;
    },
    {
      onSuccess: (result, variables) => {
        utils.invalidate(queryKeys.invites.sent());
        utils.invalidate(queryKeys.invites.byList(variables.listId));
      },
    },
  );
};
