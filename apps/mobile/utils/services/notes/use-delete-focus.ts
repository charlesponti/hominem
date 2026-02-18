import { useMutation, type UseMutationOptions } from '@tanstack/react-query'

import { useHonoClient } from '@hominem/hono-client/react'

import { LocalStore } from '~/utils/local-store'

export const useDeleteFocus = (
  props: UseMutationOptions<string, Error, string> & {
    onError?: (error: Error) => void
  }
) => {
  const client = useHonoClient()

  return useMutation<string, Error, string>({
    mutationFn: async (id: string) => {
      await client.api.notes[':id'].$delete({
        param: { id },
      })

      await LocalStore.deleteFocusItem(id)
      return id
    },
    ...props,
  })
}
