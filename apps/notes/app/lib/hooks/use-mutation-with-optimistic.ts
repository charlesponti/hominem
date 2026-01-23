import { useToast } from '@hominem/ui';

import { trpc } from '~/lib/trpc';

interface UseMutationWithOptimisticOptions<TInput, TOutput> {
  mutation: any; // tRPC mutation
  onSuccess?: (data: TOutput, variables: TInput) => void;
  onError?: (error: Error, variables: TInput) => void;
  successMessage?: string;
  errorMessage?: string;
  optimisticUpdate?: {
    queryKey: string;
    updateFn: (oldData: any, newData: TInput) => any;
  };
}

export function useMutationWithOptimistic<TInput, TOutput>({
  mutation,
  onSuccess,
  onError,
  successMessage,
  errorMessage: defaultErrorMessage,
  optimisticUpdate,
}: UseMutationWithOptimisticOptions<TInput, TOutput>) {
  const utils = trpc.useUtils();
  const { toast } = useToast();

  return mutation.useMutation({
    onMutate: async (newData: TInput) => {
      if (optimisticUpdate) {
        // Cancel any outgoing refetches
        await (utils as any)[optimisticUpdate.queryKey].cancel();

        // Snapshot the previous value
        const previousData = (utils as any)[optimisticUpdate.queryKey]
          .getData()(
            // Optimistically update to the new value
            utils as any,
          )
          [optimisticUpdate.queryKey].setData(undefined, (old: any) =>
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
        (utils as any)[optimisticUpdate.queryKey].setData(undefined, context.previousData);
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
        (utils as any)[optimisticUpdate.queryKey].invalidate();
      }
    },
  });
}
