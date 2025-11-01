import type { ContentStrategy } from '@hominem/utils/types'
import { trpc } from '~/lib/trpc'

// Type for creating a new content strategy
type CreateContentStrategyData = {
  title: string
  description?: string
  strategy: ContentStrategy
}

// Type for updating a content strategy
type UpdateContentStrategyData = {
  id: string
  title?: string
  description?: string
  strategy?: ContentStrategy
}

/**
 * Hook to fetch all content strategies for the current user
 */
export function useContentStrategies() {
  const query = trpc.contentStrategies.list.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return {
    strategies: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    count: query.data?.length || 0,
  }
}

/**
 * Hook to fetch a specific content strategy by ID
 */
export function useContentStrategy(strategyId: string) {
  const query = trpc.contentStrategies.get.useQuery(
    { id: strategyId },
    {
      enabled: !!strategyId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )

  return {
    strategy: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    found: !!query.data,
  }
}

/**
 * Hook to create a new content strategy
 */
export function useCreateContentStrategy() {
  const utils = trpc.useUtils()

  const createStrategy = trpc.contentStrategies.create.useMutation({
    onSuccess: () => {
      utils.contentStrategies.list.invalidate()
    },
  })

  return {
    createStrategy: createStrategy.mutate,
    isLoading: createStrategy.isPending,
    isError: createStrategy.isError,
    error: createStrategy.error,
  }
}

/**
 * Hook to update an existing content strategy
 */
export function useUpdateContentStrategy() {
  const utils = trpc.useUtils()

  const updateStrategy = trpc.contentStrategies.update.useMutation({
    onSuccess: (updatedStrategy) => {
      utils.contentStrategies.list.invalidate()
      utils.contentStrategies.get.invalidate({ id: updatedStrategy.id })
    },
  })

  return {
    updateStrategy: updateStrategy.mutate,
    isLoading: updateStrategy.isPending,
    isError: updateStrategy.isError,
    error: updateStrategy.error,
  }
}

/**
 * Hook to delete a content strategy
 */
export function useDeleteContentStrategy() {
  const utils = trpc.useUtils()

  const deleteStrategy = trpc.contentStrategies.delete.useMutation({
    onSuccess: () => {
      utils.contentStrategies.list.invalidate()
    },
  })

  return {
    deleteStrategy: deleteStrategy.mutate,
    isLoading: deleteStrategy.isPending,
    isError: deleteStrategy.isError,
    error: deleteStrategy.error,
  }
}
