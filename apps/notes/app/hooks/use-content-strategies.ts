import { trpc } from '~/lib/trpc';

export function useContentStrategies() {
  const query = trpc.contentStrategies.list.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    strategies: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    count: query.data?.length || 0,
  };
}

export function useContentStrategy(strategyId: string) {
  const query = trpc.contentStrategies.getById.useQuery(
    { id: strategyId },
    {
      enabled: !!strategyId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  );

  return {
    strategy: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    found: !!query.data,
  };
}

export function useCreateContentStrategy() {
  const utils = trpc.useUtils();

  const createStrategy = trpc.contentStrategies.create.useMutation({
    onSuccess: () => {
      utils.contentStrategies.list.invalidate();
    },
  });

  return {
    createStrategy: createStrategy.mutate,
    isLoading: createStrategy.isPending,
    isError: createStrategy.isError,
    error: createStrategy.error,
  };
}

export function useUpdateContentStrategy() {
  const utils = trpc.useUtils();

  const updateStrategy = trpc.contentStrategies.update.useMutation({
    onSuccess: (updatedStrategy) => {
      utils.contentStrategies.list.invalidate();
      utils.contentStrategies.getById.invalidate({ id: updatedStrategy.id });
    },
  });

  return {
    updateStrategy: updateStrategy.mutate,
    isLoading: updateStrategy.isPending,
    isError: updateStrategy.isError,
    error: updateStrategy.error,
  };
}

export function useDeleteContentStrategy() {
  const utils = trpc.useUtils();

  const deleteStrategy = trpc.contentStrategies.delete.useMutation({
    onSuccess: () => {
      utils.contentStrategies.list.invalidate();
    },
  });

  return {
    deleteStrategy: deleteStrategy.mutate,
    isLoading: deleteStrategy.isPending,
    isError: deleteStrategy.isError,
    error: deleteStrategy.error,
  };
}
