import { useAuth } from '@clerk/react-router'
import { useApiClient } from '@hominem/ui'
import type { Content, ContentType } from '@hominem/utils/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui/use-toast'

const CONTENT_QUERY_KEY_BASE = 'content'

const defaultContentFields = (
  type: ContentType = 'note'
): Omit<
  Content,
  'id' | 'content' | 'userId' | 'createdAt' | 'updatedAt' | 'synced' | 'mentions'
> => ({
  type,
  title: '',
  tags: [],
  taskMetadata:
    type === 'task' || type === 'timer'
      ? {
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          completed: false,
          startTime: undefined,
          endTime: undefined,
          isActive: false,
          duration: 0,
        }
      : null,
  analysis: {},
})

export function useCreateContent(options: { queryKey?: unknown[] } = {}) {
  const { userId, isSignedIn } = useAuth()
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const createItem = useMutation<
    Content,
    Error,
    { type: ContentType; content: string } & Partial<
      Omit<
        Content,
        'id' | 'userId' | 'content' | 'type' | 'createdAt' | 'updatedAt' | 'synced' | 'mentions'
      >
    >
  >({
    mutationFn: async (itemData) => {
      if (!isSignedIn || !userId) {
        throw new Error('User must be signed in to create content.')
      }
      const payloadForApi: Omit<
        Content,
        'id' | 'userId' | 'createdAt' | 'updatedAt' | 'synced' | 'mentions'
      > & { content: string } = {
        ...defaultContentFields(itemData.type),
        ...itemData,
      }
      const serverResponse = await apiClient.post<typeof payloadForApi, Content>(
        '/api/content',
        payloadForApi
      )
      if (!serverResponse) {
        throw new Error('API did not return created content (unexpected response).')
      }
      return serverResponse
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: options.queryKey || [CONTENT_QUERY_KEY_BASE] })
      toast({
        title: `${data.type} created`,
        description: data.title || 'Item successfully created.',
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error Creating Item',
        description: error.message || 'Could not save item to server.',
      })
    },
  })

  return createItem
}
