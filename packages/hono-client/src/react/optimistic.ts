import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useHonoClient } from './context';

/**
 * Hook for mutations with optimistic updates
 * Automatically handles rollback on error
 *
 * @example
 * const mutation = useHonoMutationWithOptimistic({
 *   queryKey: ['goals', 'list'],
 *   mutationFn: async (client, variables) => {
 *     const res = await client.api.goals.update.$post({ json: variables });
 *     return res.json();
 *   },
 *   updateFn: (oldData, newGoal) => {
 *     if (!oldData) return [newGoal];
 *     return oldData.map(g => g.id === newGoal.id ? newGoal : g);
 *   },
 * });
 */
export function useHonoMutationWithOptimistic<
  TData,
  TVariables,
  TContext = { previousData: TData | undefined },
>({
  queryKey,
  updateFn,
  mutationFn,
  onSuccess,
  onError,
  successMessage,
  errorMessage,
}: OptimisticUpdateConfig<TData, TVariables, TContext>) {
  const client = useHonoClient();
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, TContext>({
    mutationFn: (variables) => mutationFn(client, variables),

    // Optimistically update cache before mutation
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: TData | undefined) => updateFn(old, variables));

      // Return context with snapshot
      return { previousData } as TContext;
    },

    // On error, rollback to the previous value
    onError: (error, variables, context) => {
      if (context && typeof context === 'object' && context !== null && 'previousData' in context) {
        queryClient.setQueryData(
          queryKey,
          (context as { previousData: TData | undefined }).previousData,
        );
      }

      if (errorMessage) {
        console.error(errorMessage, error);
      }

      onError?.(error, variables, context);
    },

    // On success, call user handler
    onSuccess: (data, variables, context) => {
      if (successMessage) {
        console.log(successMessage);
      }

      onSuccess?.(data, variables, context);
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
