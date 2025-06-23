import { useApiClient } from '@hominem/ui'
import type { Content } from '@hominem/utils/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui/use-toast'
import { useSupabaseAuth } from '../supabase/use-auth'

const CONTENT_QUERY_KEY_BASE = 'content'

export function useUpdateContent(options: { queryKey?: unknown[] } = {}) {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const updateItem = useMutation<
    Content,
    Error,
    { id: string } & Partial<
      Omit<Content, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'synced' | 'mentions'>
    >,
    { previousContent: Content[] | undefined }
  >({
    mutationFn: async (itemData) => {
      // Let the API handle authentication - don't check user here
      if (!itemData.id) {
        throw new Error('Item ID is required for update.')
      }
      const { id, ...updateFields } = itemData
      const serverResponse = await apiClient.put<typeof updateFields, Content>(
        `/api/content/${id}`,
        updateFields
      )
      if (!serverResponse) {
        throw new Error('API did not return updated content (unexpected response).')
      }
      return serverResponse
    },
    onMutate: async (newItemData) => {
      const queryKey = options.queryKey || [CONTENT_QUERY_KEY_BASE]
      await queryClient.cancelQueries({ queryKey })
      const previousContent = queryClient.getQueryData<Content[]>(queryKey)
      queryClient.setQueryData<Content[]>(queryKey, (oldContent = []) =>
        oldContent.map((content) =>
          content.id === newItemData.id ? { ...content, ...newItemData } : content
        )
      )
      return { previousContent }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: options.queryKey || [CONTENT_QUERY_KEY_BASE] })
      toast({
        title: `${data.type} updated`,
        description: data.title || 'Item successfully updated.',
      })
    },
    onError: (error: Error, newItemData, context) => {
      const queryKey = options.queryKey || [CONTENT_QUERY_KEY_BASE]
      if (context?.previousContent) {
        queryClient.setQueryData(queryKey, context.previousContent)
      }
      toast({
        variant: 'destructive',
        title: 'Error Updating Item',
        description: error.message || 'Could not update item on server.',
      })
    },
  })

  return { updateItem }
}
