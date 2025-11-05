import { type UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import type { List } from '~/lib/types'
import { trpc } from './client'

export const useGetListInvites = (id: string) => {
  return trpc.invites.getByList.useQuery({ listId: id })
}

export const useGetLists = () => {
  return trpc.lists.getAll.useQuery()
}

export const useCreateList = (
  options?: UseMutationOptions<
    List,
    unknown,
    { name: string; description: string; isPublic?: boolean }
  >
) => {
  const queryClient = useQueryClient()

  return trpc.lists.create.useMutation({
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })

      queryClient.setQueryData<List[]>(['lists'], (oldLists = []) => {
        return [...oldLists, newList]
      })
    },
    ...options,
  })
}

export type UpdateListData = {
  id: string
  name?: string
  description?: string
}

export const useUpdateList = (options?: UseMutationOptions<List, unknown, UpdateListData>) => {
  const queryClient = useQueryClient()

  return trpc.lists.update.useMutation({
    onSuccess: (updatedList) => {
      queryClient.setQueryData<List>(['list', updatedList.id], updatedList)

      queryClient.setQueryData<List[]>(['lists'], (oldLists = []) => {
        return oldLists.map((list) => (list.id === updatedList.id ? updatedList : list))
      })
    },
    ...options,
  })
}

export const useDeleteList = (
  options?: UseMutationOptions<{ success: boolean }, unknown, { id: string }>
) => {
  const queryClient = useQueryClient()

  return trpc.lists.delete.useMutation({
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: ['list', variables.id] })

      queryClient.setQueryData<List[]>(['lists'], (oldLists = []) => {
        return oldLists.filter((list) => list.id !== variables.id)
      })
    },
    ...options,
  })
}
