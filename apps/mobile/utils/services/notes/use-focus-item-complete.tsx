import { useApiClient } from '@hominem/rpc/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { focusKeys } from './query-keys'
import type { Note } from '@hominem/rpc/types'

interface UseFocusItemCompleteOptions {
  onSuccess?: (data: Note) => void
  onError?: (error: Error) => void
}

export const useFocusItemComplete = (options?: UseFocusItemCompleteOptions) => {
  const client = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<Note, Error, string>({
    mutationKey: ['completeItem'],
    mutationFn: async (id: string) => {
      return client.notes.archive({ id })
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: focusKeys.all })
      options?.onSuccess?.(data)
    },
    onError: (error) => {
      options?.onError?.(error as Error)
    },
  })
}
