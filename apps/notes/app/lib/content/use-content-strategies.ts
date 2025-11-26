import { trpc } from '~/lib/trpc'

export function useContentStrategies() {
  const { data: strategies, isLoading, error } = trpc.contentStrategies.list.useQuery()

  return {
    strategies: strategies || [],
    isLoading,
    error,
  }
}
