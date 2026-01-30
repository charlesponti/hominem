import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';

import type { HonoClient } from '../core/client';

import { useHonoClient } from './context';

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

/**
 * Generic hook for making queries with Hono RPC
 * Automatically transforms date strings to Date objects
 *
 * @example
 * const { data } = useHonoQuery(
 *   ['finance', 'transactions', 'list'],
 *   async (client) => {
 *     const res = await client.api.finance.transactions.list.$post({ json: { limit: 10 } });
 *     return transformResponse(res);
 *   }
 * );
 */
export function useHonoQuery<TData>(
  queryKey: QueryKey,
  queryFn: (client: HonoClient) => Promise<TData>,
  options?: HonoQueryOptions<TData>,
) {
  const client = useHonoClient();

  return useQuery({
    queryKey: options?.queryKey || queryKey,
    queryFn: () => queryFn(client),
    ...options,
  });
}

/**
 * Helper to get transformed response with date conversion
 * Use this in your queryFn to automatically convert date strings to Date objects
 */

/**
 * Generic hook for making mutations with Hono RPC
 *
 * @example
 * const mutation = useHonoMutation(
 *   async (client, variables) => {
 *     const res = await client.api.finance.transactions.create.$post({ json: variables });
 *     return res.json();
 *   },
 *   {
 *     onSuccess: () => console.log('Created!'),
 *     invalidateKeys: [['finance', 'transactions']],
 *   }
 * );
 */
export function useHonoMutation<TData, TVariables = void>(
  mutationFn: (client: HonoClient, variables: TVariables) => Promise<TData>,
  options?: HonoMutationOptions<TData, TVariables>,
) {
  const client = useHonoClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(client, variables),
    onSuccess: (data, variables, context, mutationContext) => {
      // Invalidate specified query keys
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Call user's onSuccess handler if provided
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context, mutationContext);
      }
    },
    ...options,
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
