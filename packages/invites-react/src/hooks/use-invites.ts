import { useRpcMutation, useRpcQuery, useHonoUtils } from '@hominem/rpc/react'
import type {
  InvitesAcceptInput,
  InvitesAcceptOutput,
  InvitesCreateInput,
  InvitesCreateOutput,
  InvitesDeleteInput,
  InvitesDeleteOutput,
  InvitesGetByListOutput,
  InvitesGetReceivedOutput,
  InvitesGetSentInput,
  InvitesGetSentOutput,
} from '@hominem/rpc/types/invites.types'

const queryKeys = {
  invites: {
    sent: () => ['invites', 'sent'] as const,
    received: () => ['invites', 'received'] as const,
    byList: (listId: string) => ['invites', 'byList', listId] as const,
  },
  lists: {
    all: () => ['lists', 'all'] as const,
    get: (id: string) => ['lists', 'get', id] as const,
  },
}

const OPTIMISTIC_USER_ID = '00000000-0000-0000-0000-000000000000'

const createOptimisticInvite = (variables: InvitesCreateInput): InvitesCreateOutput => {
  const now = new Date().toISOString()
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
  }
}

export const useSentInvites = () =>
  useRpcQuery<InvitesGetSentOutput>(queryKeys.invites.sent(), async ({ invites }) =>
    invites.getSent({} satisfies InvitesGetSentInput),
  )

export const useReceivedInvites = () =>
  useRpcQuery<InvitesGetReceivedOutput>(queryKeys.invites.received(), async ({ invites }) =>
    invites.getReceived({}),
  )

export const useCreateInvite = () => {
  const utils = useHonoUtils()
  return useRpcMutation<InvitesCreateOutput, InvitesCreateInput>(
    async ({ invites }, variables) => invites.create(variables),
    {
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.invites.sent())
        await utils.cancel(queryKeys.invites.byList(variables.listId))

        const previousSent = utils.getData<InvitesGetSentOutput>(queryKeys.invites.sent())
        const previousByList = utils.getData<InvitesGetByListOutput>(
          queryKeys.invites.byList(variables.listId),
        )
        const optimisticInvite = createOptimisticInvite(variables)

        utils.setData<InvitesGetSentOutput>(queryKeys.invites.sent(), (old) => {
          const existing = old ?? []
          return [optimisticInvite, ...existing]
        })
        utils.setData<InvitesGetByListOutput>(queryKeys.invites.byList(variables.listId), (old) => {
          const existing = old ?? []
          return [optimisticInvite, ...existing]
        })

        return {
          previousSent,
          previousByList,
          optimisticId: optimisticInvite.id,
        }
      },
      onSuccess: (result, variables) => {
        utils.setData<InvitesGetSentOutput>(queryKeys.invites.sent(), (old) => {
          const existing = old ?? []
          return existing.map((invite) =>
            invite.listId === variables.listId && invite.invitedUserEmail === variables.invitedUserEmail
              ? result
              : invite,
          )
        })
        utils.setData<InvitesGetByListOutput>(queryKeys.invites.byList(variables.listId), (old) => {
          const existing = old ?? []
          return existing.map((invite) =>
            invite.listId === variables.listId && invite.invitedUserEmail === variables.invitedUserEmail
              ? result
              : invite,
          )
        })
        utils.invalidate(queryKeys.invites.sent())
        utils.invalidate(queryKeys.invites.byList(variables.listId));
      },
      onError: (error, variables, context) => {
        const previousSent =
          typeof context === 'object' && context !== null && 'previousSent' in context
            ? (context as { previousSent?: InvitesGetSentOutput }).previousSent
            : undefined
        const previousByList =
          typeof context === 'object' && context !== null && 'previousByList' in context
            ? (context as { previousByList?: InvitesGetByListOutput }).previousByList
            : undefined

        if (previousSent) {
          utils.setData<InvitesGetSentOutput>(queryKeys.invites.sent(), previousSent)
        }
        if (previousByList) {
          utils.setData<InvitesGetByListOutput>(
            queryKeys.invites.byList(variables.listId),
            previousByList,
          )
        }

        console.error('Failed to create invite:', error)
      },
    },
  )
}

export const useAcceptInvite = () => {
  const utils = useHonoUtils()
  return useRpcMutation<InvitesAcceptOutput, InvitesAcceptInput>(
    async ({ invites }, variables) => invites.accept(variables),
    {
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.invites.received())
        const previousReceived = utils.getData<InvitesGetReceivedOutput>(
          queryKeys.invites.received(),
        )

        utils.setData<InvitesGetReceivedOutput>(queryKeys.invites.received(), (old) => {
          const existing = old ?? []
          return existing.filter((invite) => invite.token !== variables.token)
        })

        return { previousReceived }
      },
      onSuccess: () => {
        utils.invalidate(queryKeys.invites.received())
        utils.invalidate(queryKeys.lists.all())
      },
      onError: (error, variables, context) => {
        const previousReceived =
          typeof context === 'object' && context !== null && 'previousReceived' in context
            ? (context as { previousReceived?: InvitesGetReceivedOutput }).previousReceived
            : undefined

        if (previousReceived) {
          utils.setData<InvitesGetReceivedOutput>(queryKeys.invites.received(), previousReceived)
        }

        console.error('Failed to accept invite:', error)
      },
    },
  )
}

export const useDeleteInvite = () => {
  const utils = useHonoUtils()
  return useRpcMutation<InvitesDeleteOutput, InvitesDeleteInput>(
    async ({ invites }, variables) => invites.delete(variables),
    {
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.invites.sent())
        await utils.cancel(queryKeys.invites.byList(variables.listId))

        const previousSent = utils.getData<InvitesGetSentOutput>(queryKeys.invites.sent())
        const previousByList = utils.getData<InvitesGetByListOutput>(
          queryKeys.invites.byList(variables.listId),
        )

        utils.setData<InvitesGetSentOutput>(queryKeys.invites.sent(), (old) => {
          const existing = old ?? []
          return existing.filter(
            (invite) =>
              !(
                invite.listId === variables.listId &&
                invite.invitedUserEmail === variables.invitedUserEmail
              ),
          )
        })
        utils.setData<InvitesGetByListOutput>(queryKeys.invites.byList(variables.listId), (old) => {
          const existing = old ?? []
          return existing.filter(
            (invite) =>
              !(
                invite.listId === variables.listId &&
                invite.invitedUserEmail === variables.invitedUserEmail
              ),
          )
        })

        return { previousSent, previousByList }
      },
      onSuccess: (_result, variables) => {
        utils.invalidate(queryKeys.invites.sent())
        utils.invalidate(queryKeys.invites.byList(variables.listId));
      },
      onError: (error, variables, context) => {
        const previousSent =
          typeof context === 'object' && context !== null && 'previousSent' in context
            ? (context as { previousSent?: InvitesGetSentOutput }).previousSent
            : undefined
        const previousByList =
          typeof context === 'object' && context !== null && 'previousByList' in context
            ? (context as { previousByList?: InvitesGetByListOutput }).previousByList
            : undefined

        if (previousSent) {
          utils.setData<InvitesGetSentOutput>(queryKeys.invites.sent(), previousSent)
        }
        if (previousByList) {
          utils.setData<InvitesGetByListOutput>(
            queryKeys.invites.byList(variables.listId),
            previousByList,
          )
        }

        console.error('Failed to delete invite:', error)
      },
    },
  )
}
