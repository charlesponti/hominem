import { useAuth } from '@clerk/react-router'
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
    >
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: options.queryKey || [CONTENT_QUERY_KEY_BASE] })
      toast({
        title: `${data.type} updated`,
        description: data.title || 'Item successfully updated.',
      })
    },
    onError: (error: Error) => {
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
    updateItem.mutate({ id: taskId, taskMetadata: { status: 'done' } })
  }

  return { updateItem, updateTaskStatus, toggleTaskCompletion }
}
