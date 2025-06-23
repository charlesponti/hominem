import { useApiClient } from '@hominem/ui'
import type { Content } from '@hominem/utils/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui/use-toast'
import { useSupabaseAuth } from '../supabase/use-auth'

const CONTENT_QUERY_KEY_BASE = 'content'

export function useDeleteContent(options: { queryKey?: unknown[] } = {}) {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const deleteItem = useMutation<
    { id: string },
    Error,
    string, // id of the item to delete
    { previousContent: Content[] | undefined }
  >({
    mutationFn: async (id: string) => {
      // Let the API handle authentication - don't check user here
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
