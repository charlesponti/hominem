// Error type placeholder for Hono RPC
type TRPCClientErrorLike = any;

import { useToast } from '@hominem/ui';
import { useCallback } from 'react';

import { trpc } from '~/lib/trpc';

export function useTwitterOAuth() {
  // keeping this stub as it was in original, potentially unused or pending implementation
  const refetch = useCallback(async () => {}, []);

  return {
    refetch,
  };
}

export function useTwitterAccounts() {
  const { data: accounts, isLoading, refetch } = trpc.twitter.accounts.useQuery();

  return {
    data: accounts || [],
    isLoading,
    refetch,
  };
}

export function useTwitterPost() {
  const { toast } = useToast();

  const mutation = trpc.twitter.post.useMutation({
    onSuccess: () => {
      toast({ title: 'Tweet posted successfully' });
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast({ title: 'Error posting tweet', description: error.message, variant: 'destructive' });
    },
  });

  return mutation;
}
