import type { UseMutationOptions } from '@tanstack/react-query'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from './router'
import { trpc } from './client'

type RouterInputs = inferRouterInputs<AppRouter>
type RouterOutputs = inferRouterOutputs<AppRouter>

export const useGetListInvites = (id: string) => {
  return trpc.invites.getByList.useQuery({ listId: id })
}

export const useGetLists = () => {
  return trpc.lists.getAll.useQuery()
}

export const useGetListOptions = (googleMapsId: string) => {
  return trpc.lists.getListOptions.useQuery(
    { googleMapsId },
    {
      enabled: !!googleMapsId,
    }
  )
}

export const useCreateList = (
  options?: UseMutationOptions<
    RouterOutputs['lists']['create'],
    unknown,
    RouterInputs['lists']['create']
  >
) => {
  const utils = trpc.useUtils()

  return trpc.lists.create.useMutation({
    ...options,
    onSuccess: (newList, variables, context, mutation) => {
      utils.lists.getAll.invalidate()
      utils.lists.getListOptions.invalidate()

      utils.lists.getAll.setData(undefined, (oldLists = []) => {
        // We need to match the type expected by getAll cache (ListWithSpreadOwner)
        // newList is ExtendedList (from service) which has createdBy instead of owner
        // and has places.
        const listToAdd = {
          ...newList,
          owner: newList.createdBy, // Map createdBy to owner
        }
        return [...oldLists, listToAdd]
      })

      options?.onSuccess?.(newList, variables, context, mutation)
    },
  })
}

export const useUpdateList = (
  options?: UseMutationOptions<
    RouterOutputs['lists']['update'],
    unknown,
    RouterInputs['lists']['update']
  >
) => {
  const utils = trpc.useUtils()

  return trpc.lists.update.useMutation({
    ...options,
    onSuccess: (updatedList, variables, context, mutation) => {
      utils.lists.getById.setData({ id: updatedList.id }, (old) => {
        if (!old) return old
        return {
          ...old,
          ...updatedList,
        }
      })

      utils.lists.getAll.setData(undefined, (oldLists = []) => {
        return oldLists.map((list) =>
          list.id === updatedList.id
            ? {
                ...list,
                ...updatedList,
                owner: updatedList.createdBy ?? list.owner,
              }
            : list
        )
      })

      utils.lists.getListOptions.invalidate()

      options?.onSuccess?.(updatedList, variables, context, mutation)
    },
  })
}

export const useDeleteList = (
  options?: UseMutationOptions<
    RouterOutputs['lists']['delete'],
    unknown,
    RouterInputs['lists']['delete']
  >
) => {
  const utils = trpc.useUtils()

  return trpc.lists.delete.useMutation({
    ...options,
    onSuccess: (data, variables, context, mutation) => {
      utils.lists.getAll.setData(undefined, (oldLists = []) => {
        return oldLists.filter((list) => list.id !== variables.id)
      })
      utils.lists.getAll.invalidate()
      utils.lists.getListOptions.invalidate()

      options?.onSuccess?.(data, variables, context, mutation)
    },
  })
}
