import { useAuth } from '@clerk/react-router'
import { useApiClient } from '@hominem/ui'
import type { Content } from '@hominem/utils/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui/use-toast'

const CONTENT_QUERY_KEY_BASE = 'content'

export function useDeleteContent(options: { queryKey?: unknown[] } = {}) {
  const { userId, isSignedIn } = useAuth()
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const deleteItem = useMutation<
    { id: string },
    Error,
    string, // id of the item to delete
    { previousContent: Content[] | undefined }
  >({
    mutationFn: async (id: string) => {
      if (!isSignedIn || !userId) {
        throw new Error('User must be signed in to delete content.')
      }
      const response = await apiClient.delete<null, { id: string }>(`/api/content/${id}`)
      if (!response || typeof response.id !== 'string') {
        throw new Error('API did not return expected confirmation for delete.')
      }
      return response
    },
    onMutate: async (idToDelete) => {
      const queryKey = options.queryKey || [CONTENT_QUERY_KEY_BASE]
      await queryClient.cancelQueries({ queryKey })
      const previousContent = queryClient.getQueryData<Content[]>(queryKey)
      queryClient.setQueryData<Content[]>(queryKey, (oldContent = []) =>
        oldContent.filter((content) => content.id !== idToDelete)
      )
      return { previousContent }
    },
    onSuccess: (data, idToDelete, context) => {
      queryClient.invalidateQueries({ queryKey: options.queryKey || [CONTENT_QUERY_KEY_BASE] })
      toast({ title: 'Item Deleted', description: 'Item successfully deleted.' })
    },
    onError: (error: Error, idToDelete, context) => {
      const queryKey = options.queryKey || [CONTENT_QUERY_KEY_BASE]
      if (context?.previousContent) {
        queryClient.setQueryData(queryKey, context.previousContent)
      }
      toast({
        variant: 'destructive',
        title: 'Error Deleting Item',
        description: error.message || 'Could not delete item from server.',
      })
    },
  })

  return deleteItem
}
