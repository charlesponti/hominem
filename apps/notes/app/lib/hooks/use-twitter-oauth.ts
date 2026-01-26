import { useToast } from '@hominem/ui';
import { useCallback } from 'react';

import type { HonoClient } from '@hominem/hono-client';
import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';
import type {
  TwitterAccountsListOutput,
  TwitterPostInput,
  TwitterPostOutput,
} from '@hominem/hono-rpc/types';

export function useTwitterOAuth() {
  // keeping this stub as it was in original, potentially unused or pending implementation
  const refetch = useCallback(async () => {}, []);

  return {
    refetch,
  };
}

export function useTwitterAccounts() {
  const { data: accounts, isLoading, refetch } = useHonoQuery<TwitterAccountsListOutput>(
    ['twitter', 'accounts'],
    async (client: HonoClient) => {
      const res = await client.api.twitter.accounts.$get();
      return res.json() as Promise<TwitterAccountsListOutput>;
    }
  );

  return {
    data: accounts || [],
    isLoading,
    refetch,
  };
}

export function useTwitterPost() {
  const { toast } = useToast();

  const mutation = useHonoMutation<TwitterPostOutput, TwitterPostInput>(
    async (client: HonoClient, variables: TwitterPostInput) => {
      const res = await client.api.twitter.post.$post({ json: variables });
      return res.json() as Promise<TwitterPostOutput>;
    },
    {
      onSuccess: () => {
        toast({ title: 'Tweet posted successfully' });
      },
      onError: (error) => {
        toast({ title: 'Error posting tweet', description: error.message, variant: 'destructive' });
      },
    }
  );

  return mutation;
}
