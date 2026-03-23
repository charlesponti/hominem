import { useRpcMutation, useRpcQuery } from '@hominem/rpc/react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryKey, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'
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

export const useLists = (
  options?: Omit<UseQueryOptions<ListGetAllOutput>, 'queryKey' | 'queryFn'> & {
    queryKey?: QueryKey
  },
) =>
  useRpcQuery(
    async ({ lists }) => lists.getAll({} satisfies ListGetAllInput),
    {
      queryKey: queryKeys.lists.all(),
      ...options,
    },
  )

export const useListById = (
  id: string | undefined,
  options?: Omit<UseQueryOptions<ListGetByIdOutput>, 'queryKey' | 'queryFn'> & {
    queryKey?: QueryKey
  },
) =>
  useRpcQuery(
    async ({ lists }) => {
      if (!id) throw new Error('ID is required')
      return lists.getById({ id } satisfies ListGetByIdInput)
    },
    {
      queryKey: queryKeys.lists.get(id || ''),
      enabled: !!id,
      ...options,
    },
  )

export const useCreateList = (
  options?: Omit<UseMutationOptions<ListCreateOutput, Error, ListCreateInput>, 'mutationFn'> & {
    invalidateKeys?: QueryKey[]
  },
) => {
  const queryClient = useQueryClient()
  return useRpcMutation<ListCreateOutput, ListCreateInput>(
    async ({ lists }, variables) => lists.create(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.lists.all() })
        const previousLists = queryClient.getQueryData<ListGetAllOutput>(queryKeys.lists.all())
        const optimisticList = createOptimisticList(variables)

        queryClient.setQueryData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
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
          queryClient.setQueryData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
            const existing = old ?? []
            return existing.map((list) => (list.id === optimisticId ? result : list))
          })
          queryClient.removeQueries({ queryKey: queryKeys.lists.get(optimisticId) })
        }

        queryClient.setQueryData<ListGetByIdOutput>(queryKeys.lists.get(result.id), result)
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.all() })
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' && context !== null && 'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined

        if (previousLists) {
          queryClient.setQueryData<ListGetAllOutput>(queryKeys.lists.all(), previousLists)
        }

        options?.onError?.(error, variables, context, mutationContext)
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.all() })
      },
    },
  )
}

export const useUpdateList = (
  options?: Omit<UseMutationOptions<ListUpdateOutput, Error, ListUpdateInput>, 'mutationFn'> & {
    invalidateKeys?: QueryKey[]
  },
) => {
  const queryClient = useQueryClient()
  return useRpcMutation<ListUpdateOutput, ListUpdateInput>(
    async ({ lists }, variables) => lists.update(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.lists.all() })
        await queryClient.cancelQueries({ queryKey: queryKeys.lists.get(variables.id) })

        const previousLists = queryClient.getQueryData<ListGetAllOutput>(queryKeys.lists.all())
        const previousList = queryClient.getQueryData<ListGetByIdOutput>(queryKeys.lists.get(variables.id))

        queryClient.setQueryData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? []
          return existing.map((list) =>
            list.id === variables.id ? { ...list, ...variables } : list,
          )
        })

        if (previousList) {
          queryClient.setQueryData<ListGetByIdOutput>(queryKeys.lists.get(variables.id), {
            ...previousList,
            ...variables,
          })
        }

        return { previousLists, previousList }
      },
      onSuccess: (result, variables, context, mutationContext) => {
        queryClient.setQueryData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? []
          return existing.map((list) => (list.id === result.id ? result : list))
        })
        queryClient.setQueryData<ListGetByIdOutput>(queryKeys.lists.get(result.id), result)
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.all() })
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.get(result.id) })
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
          queryClient.setQueryData<ListGetAllOutput>(queryKeys.lists.all(), previousLists)
        }
        if (previousList) {
          queryClient.setQueryData<ListGetByIdOutput>(queryKeys.lists.get(variables.id), previousList)
        }

        options?.onError?.(error, variables, context, mutationContext)
      },
      onSettled: (result, error, variables) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.all() })
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.get(variables.id) })
      },
    },
  )
}

export const useDeleteList = (
  options?: Omit<UseMutationOptions<ListDeleteOutput, Error, ListDeleteInput>, 'mutationFn'> & {
    invalidateKeys?: QueryKey[]
  },
) => {
  const queryClient = useQueryClient()
  return useRpcMutation<ListDeleteOutput, ListDeleteInput>(
    async ({ lists }, variables) => lists.delete(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.lists.all() })
        const previousLists = queryClient.getQueryData<ListGetAllOutput>(queryKeys.lists.all())

        queryClient.setQueryData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? []
          return existing.filter((list) => list.id !== variables.id)
        })
        queryClient.removeQueries({ queryKey: queryKeys.lists.get(variables.id) })

        return { previousLists }
      },
      onSuccess: (result, variables, context, mutationContext) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.all() })
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' && context !== null && 'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined

        if (previousLists) {
          queryClient.setQueryData<ListGetAllOutput>(queryKeys.lists.all(), previousLists)
        }

        options?.onError?.(error, variables, context, mutationContext)
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.all() })
      },
    },
  )
}

export const useListsContainingPlace = (
  placeId: string | undefined,
  googleMapsId: string | undefined,
) =>
  useRpcQuery(
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
      queryKey: queryKeys.lists.containing(placeId, googleMapsId),
      enabled: !!placeId || !!googleMapsId,
    },
  )

export const useRemoveCollaborator = (
  options?: Omit<
    UseMutationOptions<ListRemoveCollaboratorOutput, Error, ListRemoveCollaboratorInput>,
    'mutationFn'
  > & {
    invalidateKeys?: QueryKey[]
  },
) => {
  const queryClient = useQueryClient()
  return useRpcMutation<ListRemoveCollaboratorOutput, ListRemoveCollaboratorInput>(
    async ({ lists }, variables) => lists.removeCollaborator(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.lists.all() })
        await queryClient.cancelQueries({ queryKey: queryKeys.lists.get(variables.listId) })

        const previousLists = queryClient.getQueryData<ListGetAllOutput>(queryKeys.lists.all())
        const previousList = queryClient.getQueryData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId))

        queryClient.setQueryData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
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
          queryClient.setQueryData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId), {
            ...previousList,
            users: previousList.users.filter((user) => user.id !== variables.userId),
          })
        }

        return { previousLists, previousList }
      },
      onSuccess: (result, variables, context, mutationContext) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.all() })
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.get(variables.listId) })
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
          queryClient.setQueryData<ListGetAllOutput>(queryKeys.lists.all(), previousLists)
        }
        if (previousList) {
          queryClient.setQueryData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId), previousList)
        }

        options?.onError?.(error, variables, context, mutationContext)
      },
      onSettled: (result, error, variables) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.all() })
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.get(variables.listId) })
      },
    },
  )
}
