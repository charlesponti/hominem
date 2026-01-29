import type { HonoClient } from '@hominem/hono-client';
import type {
  TwitterAccountsListOutput,
  TwitterAuthorizeOutput,
  TwitterDisconnectOutput,
  TwitterPostOutput,
  TwitterSyncOutput,
  TwitterPostInput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Hook to get connected Twitter accounts
 */
export function useTwitterAccounts() {
  const query = useHonoQuery<TwitterAccountsListOutput>(
    ['twitter', 'accounts'],
    async (client: HonoClient) => {
      const res = await client.api.twitter.accounts.$get();
      return res.json() as Promise<TwitterAccountsListOutput>;
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  );

  const data = query.data;
  const accounts = Array.isArray(data) ? data : [];

  return {
    accounts,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to connect Twitter account
 */
export function useTwitterConnect() {
  const connectMutation = useHonoMutation<TwitterAuthorizeOutput, void>(
    async (client: HonoClient) => {
      const res = await client.api.twitter.authorize.$post();
      return res.json() as Promise<TwitterAuthorizeOutput>;
    },
    {
      onSuccess: (result) => {
        // Redirect to Twitter authorization
        window.location.href = result.authUrl;
      },
    },
  );

  return {
    connect: connectMutation.mutate,
    isLoading: connectMutation.isPending,
    error: connectMutation.error,
  };
}

/**
 * Hook to disconnect Twitter account
 */
export function useTwitterDisconnect() {
  const utils = useHonoUtils();

  const disconnectMutation = useHonoMutation<TwitterDisconnectOutput, { accountId: string }>(
    async (client: HonoClient, variables: { accountId: string }) => {
      const res = await client.api.twitter.accounts[':accountId'].$delete({
        param: { accountId: variables.accountId },
      });
      return res.json() as Promise<TwitterDisconnectOutput>;
    },
    {
      onSuccess: () => {
        utils.invalidate(['twitter', 'accounts']);
      },
    },
  );

  return {
    disconnect: disconnectMutation.mutate,
    isLoading: disconnectMutation.isPending,
    error: disconnectMutation.error,
  };
}

/**
 * Hook to post tweet
 */
export function useTwitterPost() {
  const utils = useHonoUtils();

  const postMutation = useHonoMutation<TwitterPostOutput, TwitterPostInput>(
    async (client: HonoClient, variables: TwitterPostInput) => {
      const res = await client.api.twitter.post.$post({ json: variables });
      return res.json() as Promise<TwitterPostOutput>;
    },
    {
      onSuccess: () => {
        // Invalidate content queries if we saved as content
        utils.invalidate(['content-strategies', 'list']);
        // Optionally invalidate accounts query to refresh any status
        utils.invalidate(['twitter', 'accounts']);
      },
    },
  );

  return {
    postTweet: postMutation.mutate,
    isLoading: postMutation.isPending,
    error: postMutation.error,
    data: postMutation.data,
  };
}

/**
 * Hook to sync tweets
 */
export function useTwitterSync() {
  const utils = useHonoUtils();

  const syncMutation = useHonoMutation<TwitterSyncOutput, void>(
    async (client: HonoClient) => {
      const res = await client.api.twitter.sync.$post();
      return res.json() as Promise<TwitterSyncOutput>;
    },
    {
      onSuccess: () => {
        // Invalidate content queries to show new synced tweets
        utils.invalidate(['content-strategies', 'list']);
      },
    },
  );

  return {
    sync: syncMutation.mutate,
    isLoading: syncMutation.isPending,
    error: syncMutation.error,
    data: syncMutation.data,
  };
}

/**
 * Combined hook for Twitter OAuth functionality
 */
export function useTwitterOAuth() {
  const accountsQuery = useTwitterAccounts();
  const connectMutation = useTwitterConnect();
  const disconnectMutation = useTwitterDisconnect();
  const syncMutation = useTwitterSync();

  return {
    // Data
    accounts: accountsQuery.accounts,

    // Loading states
    isConnecting: connectMutation.isLoading,
    isDisconnecting: disconnectMutation.isLoading,
    isSyncing: syncMutation.isLoading,

    // Error states
    error: connectMutation.error || disconnectMutation.error || syncMutation.error,

    // Actions
    connect: connectMutation.connect,
    disconnect: disconnectMutation.disconnect,
    sync: syncMutation.sync,

    // Refetch
    refetch: accountsQuery.refetch,
  };
}
