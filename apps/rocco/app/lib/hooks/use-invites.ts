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

const OPTIMISTIC_USER_ID = '00000000-0000-0000-0000-000000000000';

const createOptimisticInvite = (variables: InvitesCreateInput): InvitesCreateOutput => {
  const now = new Date().toISOString();
  return {
    id: `temp-invite-${Date.now()}`,
    listId: variables.listId,
    invitingUserId: OPTIMISTIC_USER_ID,
    invitedUserId: null,
    invitedUserEmail: variables.invitedUserEmail,
    token: `temp-token-${Date.now()}`,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
};

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
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.invites.sent());
        await utils.cancel(queryKeys.invites.byList(variables.listId));

        const previousSent = utils.getData<InvitesGetSentOutput>(queryKeys.invites.sent());
        const previousByList = utils.getData<InvitesGetByListOutput>(
          queryKeys.invites.byList(variables.listId),
        );
        const optimisticInvite = createOptimisticInvite(variables);

        utils.setData<InvitesGetSentOutput>(queryKeys.invites.sent(), (old) => {
          const existing = old ?? [];
          return [optimisticInvite, ...existing];
        });
        utils.setData<InvitesGetByListOutput>(queryKeys.invites.byList(variables.listId), (old) => {
          const existing = old ?? [];
          return [optimisticInvite, ...existing];
        });

        return {
          previousSent,
          previousByList,
          optimisticId: optimisticInvite.id,
        };
      },
      onSuccess: (result, variables) => {
        utils.setData<InvitesGetSentOutput>(queryKeys.invites.sent(), (old) => {
          const existing = old ?? [];
          return existing.map((invite) =>
            invite.listId === variables.listId &&
            invite.invitedUserEmail === variables.invitedUserEmail
              ? result
              : invite,
          );
        });
        utils.setData<InvitesGetByListOutput>(queryKeys.invites.byList(variables.listId), (old) => {
          const existing = old ?? [];
          return existing.map((invite) =>
            invite.listId === variables.listId &&
            invite.invitedUserEmail === variables.invitedUserEmail
              ? result
              : invite,
          );
        });
        utils.invalidate(queryKeys.invites.sent());
        utils.invalidate(queryKeys.invites.byList(variables.listId));
      },
      onError: (error, variables, context) => {
        const previousSent =
          typeof context === 'object' &&
          context !== null &&
          'previousSent' in context
            ? (context as { previousSent?: InvitesGetSentOutput }).previousSent
            : undefined;
        const previousByList =
          typeof context === 'object' &&
          context !== null &&
          'previousByList' in context
            ? (context as { previousByList?: InvitesGetByListOutput }).previousByList
            : undefined;

        if (previousSent) {
          utils.setData<InvitesGetSentOutput>(queryKeys.invites.sent(), previousSent);
        }
        if (previousByList) {
          utils.setData<InvitesGetByListOutput>(
            queryKeys.invites.byList(variables.listId),
            previousByList,
          );
        }

        console.error('Failed to create invite:', error);
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
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.invites.received());
        const previousReceived = utils.getData<InvitesGetReceivedOutput>(
          queryKeys.invites.received(),
        );

        utils.setData<InvitesGetReceivedOutput>(queryKeys.invites.received(), (old) => {
          const existing = old ?? [];
          return existing.filter((invite) => invite.token !== variables.token);
        });

        return { previousReceived };
      },
      onSuccess: (_result) => {
        utils.invalidate(queryKeys.invites.received());
        utils.invalidate(queryKeys.lists.all());
      },
      onError: (error, _variables, context) => {
        const previousReceived =
          typeof context === 'object' &&
          context !== null &&
          'previousReceived' in context
            ? (context as { previousReceived?: InvitesGetReceivedOutput }).previousReceived
            : undefined;

        if (previousReceived) {
          utils.setData<InvitesGetReceivedOutput>(queryKeys.invites.received(), previousReceived);
        }

        console.error('Failed to accept invite:', error);
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
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.invites.received());
        const previousReceived = utils.getData<InvitesGetReceivedOutput>(
          queryKeys.invites.received(),
        );

        utils.setData<InvitesGetReceivedOutput>(queryKeys.invites.received(), (old) => {
          const existing = old ?? [];
          return existing.filter((invite) => invite.token !== variables.token);
        });

        return { previousReceived };
      },
      onSuccess: (_result) => {
        utils.invalidate(queryKeys.invites.received());
      },
      onError: (error, _variables, context) => {
        const previousReceived =
          typeof context === 'object' &&
          context !== null &&
          'previousReceived' in context
            ? (context as { previousReceived?: InvitesGetReceivedOutput }).previousReceived
            : undefined;

        if (previousReceived) {
          utils.setData<InvitesGetReceivedOutput>(queryKeys.invites.received(), previousReceived);
        }

        console.error('Failed to decline invite:', error);
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
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.invites.sent());
        await utils.cancel(queryKeys.invites.byList(variables.listId));

        const previousSent = utils.getData<InvitesGetSentOutput>(queryKeys.invites.sent());
        const previousByList = utils.getData<InvitesGetByListOutput>(
          queryKeys.invites.byList(variables.listId),
        );

        utils.setData<InvitesGetSentOutput>(queryKeys.invites.sent(), (old) => {
          const existing = old ?? [];
          return existing.filter(
            (invite) =>
              !(
                invite.listId === variables.listId &&
                invite.invitedUserEmail === variables.invitedUserEmail
              ),
          );
        });
        utils.setData<InvitesGetByListOutput>(queryKeys.invites.byList(variables.listId), (old) => {
          const existing = old ?? [];
          return existing.filter(
            (invite) =>
              !(
                invite.listId === variables.listId &&
                invite.invitedUserEmail === variables.invitedUserEmail
              ),
          );
        });

        return { previousSent, previousByList };
      },
      onSuccess: (result, variables) => {
        utils.invalidate(queryKeys.invites.sent());
        utils.invalidate(queryKeys.invites.byList(variables.listId));
      },
      onError: (error, variables, context) => {
        const previousSent =
          typeof context === 'object' &&
          context !== null &&
          'previousSent' in context
            ? (context as { previousSent?: InvitesGetSentOutput }).previousSent
            : undefined;
        const previousByList =
          typeof context === 'object' &&
          context !== null &&
          'previousByList' in context
            ? (context as { previousByList?: InvitesGetByListOutput }).previousByList
            : undefined;

        if (previousSent) {
          utils.setData<InvitesGetSentOutput>(queryKeys.invites.sent(), previousSent);
        }
        if (previousByList) {
          utils.setData<InvitesGetByListOutput>(
            queryKeys.invites.byList(variables.listId),
            previousByList,
          );
        }

        console.error('Failed to delete invite:', error);
      },
    },
  );
};
