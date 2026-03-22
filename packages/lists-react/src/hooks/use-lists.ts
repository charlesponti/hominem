import type { HonoMutationOptions, HonoQueryOptions } from '@hominem/rpc/react'
import { useRpcMutation, useRpcQuery, useHonoUtils } from '@hominem/rpc/react'
import type {
  ListCreateInput,
  ListCreateOutput,
  ListDeleteInput,
  ListDeleteOutput,
  ListGetAllInput,
  ListGetAllOutput,
  ListGetByIdInput,
  ListGetByIdOutput,
  ListGetContainingPlaceInput,
  ListGetContainingPlaceOutput,
  ListRemoveCollaboratorInput,
  ListRemoveCollaboratorOutput,
  ListUpdateInput,
  ListUpdateOutput,
} from '@hominem/rpc/types/lists.types'

const queryKeys = {
  lists: {
    all: () => ['lists', 'all'] as const,
    get: (id: string) => ['lists', 'get', id] as const,
    containing: (placeId?: string, googleMapsId?: string) =>
      ['lists', 'containing', placeId, googleMapsId] as const,
  },
}

const OPTIMISTIC_OWNER_ID = '00000000-0000-0000-0000-000000000000'

const createOptimisticList = (variables: ListCreateInput): ListCreateOutput => {
  const now = new Date().toISOString()
  return {
    id: `temp-list-${Date.now()}`,
    name: variables.name,
    description: variables.description ?? null,
    ownerId: OPTIMISTIC_OWNER_ID,
    isPublic: variables.isPublic ?? false,
    createdAt: now,
    updatedAt: now,
    places: [],
    createdBy: null,
    users: [],
  }
}

export const useLists = (options?: HonoQueryOptions<ListGetAllOutput>) =>
  useRpcQuery<ListGetAllOutput>(
    queryKeys.lists.all(),
    async ({ lists }) => lists.getAll({} satisfies ListGetAllInput),
    options,
  )

export const useListById = (
  id: string | undefined,
  options?: HonoQueryOptions<ListGetByIdOutput>,
) =>
  useRpcQuery<ListGetByIdOutput>(
    queryKeys.lists.get(id || ''),
    async ({ lists }) => {
      if (!id) throw new Error('ID is required')
      return lists.getById({ id } satisfies ListGetByIdInput)
    },
    {
      enabled: !!id,
      ...options,
    },
  )

export const useCreateList = (
  options?: HonoMutationOptions<ListCreateOutput, ListCreateInput>,
) => {
  const utils = useHonoUtils()
  return useRpcMutation<ListCreateOutput, ListCreateInput>(
    async ({ lists }, variables) => lists.create(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.lists.all())
        const previousLists = utils.getData<ListGetAllOutput>(queryKeys.lists.all())
        const optimisticList = createOptimisticList(variables)

        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? []
          return [optimisticList, ...existing]
        })

        return {
          previousLists,
          optimisticId: optimisticList.id,
        }
      },
      onSuccess: (result, variables, context, mutationContext) => {
        const optimisticId =
          typeof context === 'object' &&
          context !== null &&
          'optimisticId' in context &&
          typeof context.optimisticId === 'string'
            ? context.optimisticId
            : null

        if (optimisticId) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
            const existing = old ?? []
            return existing.map((list) => (list.id === optimisticId ? result : list))
          })
          utils.remove(queryKeys.lists.get(optimisticId))
        }

        utils.setData<ListGetByIdOutput>(queryKeys.lists.get(result.id), result)
        utils.invalidate(queryKeys.lists.all())
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' && context !== null && 'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined

        if (previousLists) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), previousLists)
        }

        options?.onError?.(error, variables, context, mutationContext)
      },
      onSettled: () => {
        utils.invalidate(queryKeys.lists.all())
      },
    },
  )
}

export const useUpdateList = (
  options?: HonoMutationOptions<ListUpdateOutput, ListUpdateInput>,
) => {
  const utils = useHonoUtils()
  return useRpcMutation<ListUpdateOutput, ListUpdateInput>(
    async ({ lists }, variables) => lists.update(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.lists.all())
        await utils.cancel(queryKeys.lists.get(variables.id))

        const previousLists = utils.getData<ListGetAllOutput>(queryKeys.lists.all())
        const previousList = utils.getData<ListGetByIdOutput>(queryKeys.lists.get(variables.id))

        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? []
          return existing.map((list) =>
            list.id === variables.id ? { ...list, ...variables } : list,
          )
        })

        if (previousList) {
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.id), {
            ...previousList,
            ...variables,
          })
        }

        return { previousLists, previousList }
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? []
          return existing.map((list) => (list.id === result.id ? result : list))
        })
        utils.setData<ListGetByIdOutput>(queryKeys.lists.get(result.id), result)
        utils.invalidate(queryKeys.lists.all())
        utils.invalidate(queryKeys.lists.get(result.id))
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' && context !== null && 'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined
        const previousList =
          typeof context === 'object' && context !== null && 'previousList' in context
            ? (context as { previousList?: ListGetByIdOutput }).previousList
            : undefined

        if (previousLists) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), previousLists)
        }
        if (previousList) {
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.id), previousList)
        }

        options?.onError?.(error, variables, context, mutationContext)
      },
      onSettled: (result, error, variables) => {
        utils.invalidate(queryKeys.lists.all())
        utils.invalidate(queryKeys.lists.get(variables.id))
      },
    },
  )
}

export const useDeleteList = (
  options?: HonoMutationOptions<ListDeleteOutput, ListDeleteInput>,
) => {
  const utils = useHonoUtils()
  return useRpcMutation<ListDeleteOutput, ListDeleteInput>(
    async ({ lists }, variables) => lists.delete(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.lists.all())
        const previousLists = utils.getData<ListGetAllOutput>(queryKeys.lists.all())

        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? []
          return existing.filter((list) => list.id !== variables.id)
        })
        utils.remove(queryKeys.lists.get(variables.id))

        return { previousLists }
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.lists.all())
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' && context !== null && 'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined

        if (previousLists) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), previousLists)
        }

        options?.onError?.(error, variables, context, mutationContext)
      },
      onSettled: () => {
        utils.invalidate(queryKeys.lists.all())
      },
    },
  )
}

export const useListsContainingPlace = (
  placeId: string | undefined,
  googleMapsId: string | undefined,
) =>
  useRpcQuery<ListGetContainingPlaceOutput>(
    queryKeys.lists.containing(placeId, googleMapsId),
    async ({ lists }) => {
      const input: ListGetContainingPlaceInput = {}
      if (placeId !== undefined) {
        input.placeId = placeId
      }
      if (googleMapsId !== undefined) {
        input.googleMapsId = googleMapsId
      }
      return lists.getContainingPlace(input)
    },
    {
      enabled: !!placeId || !!googleMapsId,
    },
  )

export const useRemoveCollaborator = (
  options?: HonoMutationOptions<ListRemoveCollaboratorOutput, ListRemoveCollaboratorInput>,
) => {
  const utils = useHonoUtils()
  return useRpcMutation<ListRemoveCollaboratorOutput, ListRemoveCollaboratorInput>(
    async ({ lists }, variables) => lists.removeCollaborator(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.lists.all())
        await utils.cancel(queryKeys.lists.get(variables.listId))

        const previousLists = utils.getData<ListGetAllOutput>(queryKeys.lists.all())
        const previousList = utils.getData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId))

        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? []
          return existing.map((list) => {
            if (list.id !== variables.listId || !list.users) return list
            return {
              ...list,
              users: list.users.filter((user) => user.id !== variables.userId),
            }
          })
        })

        if (previousList && previousList.users) {
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId), {
            ...previousList,
            users: previousList.users.filter((user) => user.id !== variables.userId),
          })
        }

        return { previousLists, previousList }
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.lists.all())
        utils.invalidate(queryKeys.lists.get(variables.listId))
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' && context !== null && 'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined
        const previousList =
          typeof context === 'object' && context !== null && 'previousList' in context
            ? (context as { previousList?: ListGetByIdOutput }).previousList
            : undefined

        if (previousLists) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), previousLists)
        }
        if (previousList) {
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId), previousList)
        }

        options?.onError?.(error, variables, context, mutationContext)
      },
      onSettled: (result, error, variables) => {
        utils.invalidate(queryKeys.lists.all())
        utils.invalidate(queryKeys.lists.get(variables.listId))
      },
    },
  )
}
