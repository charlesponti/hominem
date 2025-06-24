import { useApiClient } from '@hominem/ui'
import type { Content, ContentType } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'
import { useToast } from '../../components/ui/use-toast'

const CONTENT_QUERY_KEY_BASE = 'content'

export interface UseContentQueryOptions {
  type?: ContentType | ContentType[]
  tags?: string[]
  searchText?: string
  querySuffix?: string
}

export function useContentQuery(options: UseContentQueryOptions = {}) {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })
  const { toast } = useToast()

  const getQueryKey = (): unknown[] => {
    const key: unknown[] = [CONTENT_QUERY_KEY_BASE, 'user']
    if (options.type) {
      key.push(`type: ${Array.isArray(options.type) ? options.type.join(',') : options.type}`)
    }
    if (options.tags && options.tags.length > 0) {
      key.push(`tags: ${options.tags.sort().join(',')}`)
    }
    if (options.searchText) {
      key.push(options.searchText)
    }
    if (options.querySuffix) {
      key.push(options.querySuffix)
    }
    return key
  }

  const contentQuery = useQuery<Content[], Error>({
    queryKey: getQueryKey(),
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (options.type) {
        const types = Array.isArray(options.type) ? options.type : [options.type]
        for (const t of types) {
          queryParams.append('types', t)
        }
      }
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          queryParams.append('tags', tag)
        }
      }
      if (options.searchText) {
        queryParams.append('query', options.searchText)
      }
      const url = `/api/content${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

      try {
        const serverContent = await apiClient.get<null, { content: Content[] }>(url)
        return Array.isArray(serverContent?.content) ? serverContent.content : []
      } catch (error) {
        if (
          error instanceof Error &&
          'status' in error &&
          (error as Error & { status: number }).status === 401
        ) {
          return []
        }
        throw error
      }
    },
    staleTime: 1000 * 60 * 1,
    onError: (error: Error) => {
      if (!('status' in error) || (error as Error & { status: number }).status !== 401) {
        toast({
          variant: 'destructive',
          title: 'Error Fetching Content',
          description: error.message || 'Could not load data from server.',
        })
      }
    },
  })

  return {
    ...contentQuery,
    data: contentQuery.data || [],
  }
}
