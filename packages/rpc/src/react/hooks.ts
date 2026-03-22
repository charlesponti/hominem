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

export interface HonoQueryOptions<TData> extends Omit<
  UseQueryOptions<TData>,
  'queryKey' | 'queryFn'
> {
  queryKey?: QueryKey;
}

export interface HonoMutationOptions<TData, TVariables> extends Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
> {
  invalidateKeys?: QueryKey[];
}

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
 *   ['finance', 'transactions', 'list'],
 *   async ({ finance }) => {
 *     return finance.listTransactions({ limit: 10, sortBy: 'date', sortDirection: 'desc' });
 *   }
 * );
 */
export function useRpcQuery<TData>(
  queryKey: QueryKey,
  queryFn: (client: ApiClient) => Promise<TData>,
  options?: HonoQueryOptions<TData>,
) {
  const client = useApiClient();

  return useQuery({
    queryKey: options?.queryKey || queryKey,
    queryFn: () => queryFn(client),
    ...options,
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
  options?: HonoMutationOptions<TData, TVariables>,
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
export function useHonoUtils() {
  const queryClient = useQueryClient();

  return {
    invalidate: (queryKey: QueryKey) => {
      return queryClient.invalidateQueries({ queryKey });
    },
    refetch: (queryKey: QueryKey) => {
      return queryClient.refetchQueries({ queryKey });
    },
    setData: <TData>(queryKey: QueryKey, updater: TData | ((old: TData | undefined) => TData)) => {
      return queryClient.setQueryData(queryKey, updater);
    },
    getData: <TData>(queryKey: QueryKey) => {
      return queryClient.getQueryData<TData>(queryKey);
    },
    cancel: (queryKey: QueryKey) => {
      return queryClient.cancelQueries({ queryKey });
    },
    remove: (queryKey: QueryKey) => {
      return queryClient.removeQueries({ queryKey });
    },
  };
}
