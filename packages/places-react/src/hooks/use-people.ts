import { useRpcMutation, useRpcQuery, useHonoUtils } from '@hominem/rpc/react'
import type {
  PeopleListOutput,
  PeopleCreateInput,
  PeopleCreateOutput,
} from '@hominem/rpc/types/people.types'

const queryKeys = {
  people: {
    list: () => ['people', 'list'] as const,
  },
}

/**
 * Get all people/contacts
 */
export const usePeople = () =>
  useRpcQuery<PeopleListOutput>(queryKeys.people.list(), async () => [])

/**
 * Create person/contact
 */
export const useCreatePerson = () => {
  const utils = useHonoUtils()
  return useRpcMutation<PeopleCreateOutput, PeopleCreateInput>(
    async (_client, variables: PeopleCreateInput) => {
      const now = new Date().toISOString()
      return {
        id: `temp-person-${Date.now()}`,
        userId: '00000000-0000-0000-0000-000000000000',
        firstName: variables.firstName,
        lastName: variables.lastName ?? null,
        email: variables.email ?? null,
        phone: variables.phone ?? null,
        linkedinUrl: null,
        title: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      }
    },
    {
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.people.list())
        const previousPeople = utils.getData<PeopleListOutput>(queryKeys.people.list())
        const now = new Date().toISOString()
        const optimisticPerson: PeopleCreateOutput = {
          id: `temp-person-${Date.now()}`,
          userId: '00000000-0000-0000-0000-000000000000',
          firstName: variables.firstName,
          lastName: variables.lastName ?? null,
          email: variables.email ?? null,
          phone: variables.phone ?? null,
          linkedinUrl: null,
          title: null,
          notes: null,
          createdAt: now,
          updatedAt: now,
        }

        utils.setData<PeopleListOutput>(queryKeys.people.list(), (old) => {
          const existing = old ?? []
          return [optimisticPerson, ...existing]
        })

        return { previousPeople, optimisticId: optimisticPerson.id }
      },
      onSuccess: () => {
        utils.invalidate(queryKeys.people.list())
      },
      onError: (error, variables, context) => {
        void variables
        const previousPeople =
          typeof context === 'object' && context !== null && 'previousPeople' in context
            ? (context as { previousPeople?: PeopleListOutput }).previousPeople
            : undefined

        if (previousPeople) {
          utils.setData<PeopleListOutput>(queryKeys.people.list(), previousPeople)
        }

        console.error('Failed to create person:', error)
      },
      onSettled: () => {
        utils.invalidate(queryKeys.people.list())
      },
    },
  )
}
