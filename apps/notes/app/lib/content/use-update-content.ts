import { useAuth } from '~/lib/supabase'
import { useApiClient } from '@hominem/ui'
import type { Content, TaskStatus } from '@hominem/utils/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui/use-toast'

const CONTENT_QUERY_KEY_BASE = 'content'

export function useUpdateContent(options: { queryKey?: unknown[] } = {}) {
  const { userId, isSignedIn } = useAuth()
  const apiClient = useApiClient()
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
      if (!isSignedIn || !userId) {
        throw new Error('User must be signed in to update content.')
      }
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

  function updateTaskStatus({ taskId, status }: { taskId: string; status: TaskStatus }) {
    updateItem.mutate({ id: taskId, taskMetadata: { status } })
  }

  function toggleTaskCompletion(taskId: string) {
    const queryKey = options.queryKey || [CONTENT_QUERY_KEY_BASE]
    const previousContent = queryClient.getQueryData<Content[]>(queryKey)
    const currentItem = previousContent?.find((item) => item.id === taskId)

    let newStatus: TaskStatus = 'done'
    if (currentItem?.taskMetadata?.status === 'done') {
      newStatus = 'todo'
    }

    updateItem.mutate({ id: taskId, taskMetadata: { status: newStatus } })
  }

  return { updateItem, updateTaskStatus, toggleTaskCompletion }
}
