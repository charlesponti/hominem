import { useApiClient } from '@hominem/ui'
import type { Content, ContentType } from '@hominem/utils/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '~/lib/supabase'
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
    type === 'task'
      ? {
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          startTime: undefined,
          endTime: undefined,
          duration: 0,
        }
      : null,
  tweetMetadata: type === 'tweet' ? { status: 'draft' as const } : null,
  analysis: {},
})

export function useCreateContent(options: { queryKey?: unknown[] } = {}) {
  const { user, isAuthenticated } = useAuth()
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
    >,
    { previousContent: Content[] | undefined }
  >({
    mutationFn: async (itemData) => {
      if (!isAuthenticated || !user) {
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
    onMutate: async (newItemData) => {
      const queryKey = options.queryKey || [CONTENT_QUERY_KEY_BASE]
      await queryClient.cancelQueries({ queryKey })
      const previousContent = queryClient.getQueryData<Content[]>(queryKey)

      // Optimistically add the new item to the cache
      const tempId = `temp-${Date.now()}`
      const optimisticItem: Content = {
        ...defaultContentFields(newItemData.type),
        ...newItemData,
        id: tempId,
        userId: user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false,
        mentions: [],
      }

      queryClient.setQueryData<Content[]>(queryKey, (oldContent = []) => [
        ...oldContent,
        optimisticItem,
      ])
      return { previousContent }
    },
    onSuccess: (data, newItemData, context) => {
      const queryKey = options.queryKey || [CONTENT_QUERY_KEY_BASE]
      queryClient.setQueryData<Content[]>(queryKey, (oldContent = []) =>
        oldContent.map((content) =>
          content.id.startsWith('temp-') &&
          content.title === newItemData.title &&
          content.type === newItemData.type
            ? data
            : content
        )
      )
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error: Error, newItemData, context) => {
      const queryKey = options.queryKey || [CONTENT_QUERY_KEY_BASE]
      if (context?.previousContent) {
        queryClient.setQueryData(queryKey, context.previousContent)
      }
      toast({
        variant: 'destructive',
        title: 'Error Creating Item',
        description: error.message || 'Could not save item to server.',
      })
    },
  })

  return createItem
}
