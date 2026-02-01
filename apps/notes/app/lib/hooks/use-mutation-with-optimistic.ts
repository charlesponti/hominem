import type { HonoClient } from '@hominem/hono-client';

import { useHonoMutation, useHonoUtils } from '@hominem/hono-client/react';
import { useToast } from '@hominem/ui';

interface UseMutationWithOptimisticOptions<TInput, TOutput> {
  // mutationFn runs with (client, variables)
  mutationFn: (client: HonoClient, variables: TInput) => Promise<TOutput>;
  onSuccess?: (data: TOutput, variables: TInput) => void;
  onError?: (error: Error, variables: TInput) => void;
  successMessage?: string;
  errorMessage?: string;
  optimisticUpdate?: {
    queryKey: unknown[];
    updateFn: (oldData: unknown | undefined, newData: TInput) => unknown;
  };
}

export function useMutationWithOptimistic<TInput, TOutput>({
  mutationFn,
  onSuccess,
  onError,
  successMessage,
  errorMessage: defaultErrorMessage,
  optimisticUpdate,
}: UseMutationWithOptimisticOptions<TInput, TOutput>) {
  const utils = useHonoUtils();
  const { toast } = useToast();

  return useHonoMutation<TOutput, TInput>(
    async (client: HonoClient, variables: TInput) => mutationFn(client, variables),
    {
      onMutate: async (newData: TInput) => {
        if (optimisticUpdate) {
          // Cancel any outgoing refetches
          await utils.cancel(optimisticUpdate.queryKey);

          // Snapshot the previous value
          const previousData = utils.getData<unknown>(optimisticUpdate.queryKey);

          // Optimistically update to the new value
          utils.setData(optimisticUpdate.queryKey, (old: unknown | undefined) =>
            optimisticUpdate.updateFn(old, newData),
          );

          // Return a context object with the snapshotted value
          return { previousData };
        }
        return undefined;
      },
      onSuccess: (data: TOutput, variables: TInput) => {
        if (successMessage) {
          toast({ description: successMessage });
        }
        onSuccess?.(data, variables);
      },
      onError: (err: Error, variables: TInput, context: any) => {
        if (optimisticUpdate && context?.previousData) {
          // If the mutation fails, use the context returned from onMutate to roll back
          utils.setData(optimisticUpdate.queryKey, context.previousData);
        }

        const errorMessage = defaultErrorMessage || err.message || 'An error occurred';
        toast({
          variant: 'destructive',
          description: errorMessage,
        });
        onError?.(err, variables);
      },
      onSettled: () => {
        if (optimisticUpdate) {
          // Always refetch after error or success to ensure we have the latest data
          utils.invalidate(optimisticUpdate.queryKey);
        }
      },
    },
  );
}
