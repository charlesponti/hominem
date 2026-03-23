import { useQueryClient } from '@tanstack/react-query'
import { useRpcMutation, useRpcQuery } from '@hominem/rpc/react'
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
  useRpcQuery(
    async ({ invites }) => invites.getSent({} satisfies InvitesGetSentInput),
    { queryKey: queryKeys.invites.sent() },
  )

export const useReceivedInvites = () =>
  useRpcQuery(
    async ({ invites }) => invites.getReceived({}),
    { queryKey: queryKeys.invites.received() },
  )

export const useCreateInvite = () => {
  const queryClient = useQueryClient()
  return useRpcMutation<InvitesCreateOutput, InvitesCreateInput>(
    async ({ invites }, variables) => invites.create(variables),
    {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.invites.sent() })
        await queryClient.cancelQueries({ queryKey: queryKeys.invites.byList(variables.listId) })

        const previousSent = queryClient.getQueryData<InvitesGetSentOutput>(queryKeys.invites.sent())
        const previousByList = queryClient.getQueryData<InvitesGetByListOutput>(
          queryKeys.invites.byList(variables.listId),
        )
        const optimisticInvite = createOptimisticInvite(variables)

        queryClient.setQueryData<InvitesGetSentOutput>(queryKeys.invites.sent(), (old) => {
          const existing = old ?? []
          return [optimisticInvite, ...existing]
        })
        queryClient.setQueryData<InvitesGetByListOutput>(queryKeys.invites.byList(variables.listId), (old) => {
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
        queryClient.setQueryData<InvitesGetSentOutput>(queryKeys.invites.sent(), (old) => {
          const existing = old ?? []
          return existing.map((invite) =>
            invite.listId === variables.listId && invite.invitedUserEmail === variables.invitedUserEmail
              ? result
              : invite,
          )
        })
        queryClient.setQueryData<InvitesGetByListOutput>(queryKeys.invites.byList(variables.listId), (old) => {
          const existing = old ?? []
          return existing.map((invite) =>
            invite.listId === variables.listId && invite.invitedUserEmail === variables.invitedUserEmail
              ? result
              : invite,
          )
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.invites.sent() })
        queryClient.invalidateQueries({ queryKey: queryKeys.invites.byList(variables.listId) })
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
          queryClient.setQueryData<InvitesGetSentOutput>(queryKeys.invites.sent(), previousSent)
        }
        if (previousByList) {
          queryClient.setQueryData<InvitesGetByListOutput>(
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
  const queryClient = useQueryClient()
  return useRpcMutation<InvitesAcceptOutput, InvitesAcceptInput>(
    async ({ invites }, variables) => invites.accept(variables),
    {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.invites.received() })
        const previousReceived = queryClient.getQueryData<InvitesGetReceivedOutput>(
          queryKeys.invites.received(),
        )

        queryClient.setQueryData<InvitesGetReceivedOutput>(queryKeys.invites.received(), (old) => {
          const existing = old ?? []
          return existing.filter((invite) => invite.token !== variables.token)
        })

        return { previousReceived }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.invites.received() })
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.all() })
      },
      onError: (error, variables, context) => {
        const previousReceived =
          typeof context === 'object' && context !== null && 'previousReceived' in context
            ? (context as { previousReceived?: InvitesGetReceivedOutput }).previousReceived
            : undefined

        if (previousReceived) {
          queryClient.setQueryData<InvitesGetReceivedOutput>(queryKeys.invites.received(), previousReceived)
        }

        console.error('Failed to accept invite:', error)
      },
    },
  )
}

export const useDeleteInvite = () => {
  const queryClient = useQueryClient()
  return useRpcMutation<InvitesDeleteOutput, InvitesDeleteInput>(
    async ({ invites }, variables) => invites.delete(variables),
    {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.invites.sent() })
        await queryClient.cancelQueries({ queryKey: queryKeys.invites.byList(variables.listId) })

        const previousSent = queryClient.getQueryData<InvitesGetSentOutput>(queryKeys.invites.sent())
        const previousByList = queryClient.getQueryData<InvitesGetByListOutput>(
          queryKeys.invites.byList(variables.listId),
        )

        queryClient.setQueryData<InvitesGetSentOutput>(queryKeys.invites.sent(), (old) => {
          const existing = old ?? []
          return existing.filter(
            (invite) =>
              !(
                invite.listId === variables.listId &&
                invite.invitedUserEmail === variables.invitedUserEmail
              ),
          )
        })
        queryClient.setQueryData<InvitesGetByListOutput>(queryKeys.invites.byList(variables.listId), (old) => {
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
        queryClient.invalidateQueries({ queryKey: queryKeys.invites.sent() })
        queryClient.invalidateQueries({ queryKey: queryKeys.invites.byList(variables.listId) });
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
          queryClient.setQueryData<InvitesGetSentOutput>(queryKeys.invites.sent(), previousSent)
        }
        if (previousByList) {
          queryClient.setQueryData<InvitesGetByListOutput>(
            queryKeys.invites.byList(variables.listId),
            previousByList,
          )
        }

        console.error('Failed to delete invite:', error)
      },
    },
  )
}
