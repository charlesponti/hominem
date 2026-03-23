import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';

import type { ApiClient } from '../core/api-client';

import { useApiClient } from './context';

export interface OptimisticUpdateConfig<
  TData,
  TVariables,
  TContext = { previousData: TData | undefined }
> {
  queryKey: QueryKey;
  mutationFn: (client: ApiClient, variables: TVariables) => Promise<TData>;
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Generic hook for making queries with Hono RPC
 * Uses the shared API client from context and forwards React Query options
 *
 * @example
 * const { data } = useRpcQuery(
 *   async ({ finance }) => {
 *     return finance.listTransactions({ limit: 10, sortBy: 'date', sortDirection: 'desc' });
 *   }
 *   {
 *     queryKey: ['finance', 'transactions', 'list'],
 *   }
 * );
 */
export function useRpcQuery<TData>(
  queryFn: (client: ApiClient) => Promise<TData>,
  options: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'> & {
    queryKey: QueryKey
  },
) {
  const client = useApiClient();
  const { queryKey, ...queryOptions } = options;

  return useQuery({
    queryKey,
    queryFn: () => queryFn(client),
    ...queryOptions,
  });
}

/**
 * Hook to get query utilities for manual cache management
 */

/**
 * Generic hook for making mutations with Hono RPC
 *
 * @example
 * const mutation = useRpcMutation(
 *   async ({ places }, variables) => {
 *     return places.create(variables);
 *   },
 *   {
 *     onSuccess: () => console.log('Created!'),
 *     invalidateKeys: [['finance', 'transactions']],
 *   }
 * );
 */
export function useRpcMutation<TData, TVariables = void>(
  mutationFn: (client: ApiClient, variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> & {
    invalidateKeys?: QueryKey[]
  },
) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { invalidateKeys, onSuccess, ...mutationOptions } = options ?? {};

  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(client, variables),
    ...mutationOptions,
    onSuccess: (data, variables, context, mutationContext) => {
      // Invalidate specified query keys
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Call user's onSuccess handler if provided
      if (onSuccess) {
        onSuccess(data, variables, context, mutationContext);
      }
    },
  });
}

/**
 * Hook to get query utilities for manual cache management
 */
