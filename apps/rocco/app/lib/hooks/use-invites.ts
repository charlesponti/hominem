import type { HonoClient } from '@hominem/hono-client';
import type {
  InvitesGetReceivedOutput,
  InvitesGetSentOutput,
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
import type { ApiResult } from '@hominem/services';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Get received invites
 */
export const useReceivedInvites = (token?: string) =>
  useHonoQuery<ApiResult<InvitesGetReceivedOutput>>(
    ['invites', 'received', token],
    async (client: HonoClient) => {
      const res = await client.api.invites.received.$post({ json: { token } });
      return res.json();
    },
  );

/**
 * Get sent invites
 */
export const useSentInvites = () =>
  useHonoQuery<ApiResult<InvitesGetSentOutput>>(['invites', 'sent'], async (client: HonoClient) => {
    const res = await client.api.invites.sent.$post({ json: {} });
    return res.json();
  });

/**
 * Get invites for a specific list
 */
export const useListInvites = (listId: string | undefined) =>
  useHonoQuery<ApiResult<InvitesGetByListOutput>>(
    ['invites', 'by-list', listId],
    async (client: HonoClient) => {
      if (!listId) return { success: true, data: [] };
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
  return useHonoMutation<ApiResult<InvitesCreateOutput>, InvitesCreateInput>(
    async (client: HonoClient, variables: InvitesCreateInput) => {
      const res = await client.api.invites.create.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result: ApiResult<InvitesCreateOutput>, variables: InvitesCreateInput) => {
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
  return useHonoMutation<ApiResult<InvitesAcceptOutput>, InvitesAcceptInput>(
    async (client: HonoClient, variables: InvitesAcceptInput) => {
      const res = await client.api.invites.accept.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result: ApiResult<InvitesAcceptOutput>, _variables: InvitesAcceptInput) => {
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
  return useHonoMutation<ApiResult<InvitesDeclineOutput>, InvitesDeclineInput>(
    async (client: HonoClient, variables: InvitesDeclineInput) => {
      const res = await client.api.invites.decline.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result: ApiResult<InvitesDeclineOutput>, _variables: InvitesDeclineInput) => {
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
  return useHonoMutation<ApiResult<InvitesDeleteOutput>, InvitesDeleteInput>(
    async (client: HonoClient, variables: InvitesDeleteInput) => {
      const res = await client.api.invites.delete.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result: ApiResult<InvitesDeleteOutput>, variables: InvitesDeleteInput) => {
        if (result.success) {
          utils.invalidate(['invites', 'sent']);
          utils.invalidate(['invites', 'by-list', variables.listId]);
        }
      },
    },
  );
};
