import type { HonoClient } from '@hominem/hono-client';
import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

// TODO: Import proper types from hono-rpc/types once available
// For now relying on inference or any

export function useContentStrategies() {
  const query = useHonoQuery(
    ['content-strategies', 'list'],
    async (client: HonoClient) => {
      const res = await client.api['content-strategies'].$get();
      return res.json();
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  const data = query.data as any; // Cast to avoid strict type checks for now
  const strategies = data?.success ? data.data : [];

  return {
    strategies,
    isLoading: query.isLoading,
    error: query.error,
    count: strategies.length,
  };
}

export function useContentStrategy(strategyId: string) {
  const query = useHonoQuery(
    ['content-strategies', strategyId],
    async (client: HonoClient) => {
      const res = await client.api['content-strategies'][':id'].$get({
        param: { id: strategyId }
      });
      return res.json();
    },
    {
      enabled: !!strategyId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  const data = query.data as any;
  const strategy = data?.success ? data.data : null;

  return {
    strategy,
    isLoading: query.isLoading,
    error: query.error,
    found: !!strategy,
  };
}

export function useCreateContentStrategy() {
  const utils = useHonoUtils();

  const createStrategy = useHonoMutation(
    async (client: HonoClient, variables: any) => {
      const res = await client.api['content-strategies'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['content-strategies', 'list']);
      },
    }
  );

  return {
    createStrategy: createStrategy.mutate,
    isLoading: createStrategy.isPending,
    isError: createStrategy.isError,
    error: createStrategy.error,
  };
}

export function useUpdateContentStrategy() {
  const utils = useHonoUtils();

  const updateStrategy = useHonoMutation(
    async (client: HonoClient, variables: any) => {
      const { id, ...data } = variables;
      const res = await client.api['content-strategies'][':id'].$patch({
        param: { id },
        json: data
      });
      return res.json();
    },
    {
      onSuccess: (result: any) => {
        if (result.success) {
            utils.invalidate(['content-strategies', 'list']);
            utils.invalidate(['content-strategies', result.data.id]);
        }
      },
    }
  );

  return {
    updateStrategy: updateStrategy.mutate,
    isLoading: updateStrategy.isPending,
    isError: updateStrategy.isError,
    error: updateStrategy.error,
  };
}

export function useDeleteContentStrategy() {
  const utils = useHonoUtils();

  const deleteStrategy = useHonoMutation(
    async (client: HonoClient, variables: { id: string }) => {
      const res = await client.api['content-strategies'][':id'].$delete({
        param: { id: variables.id }
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['content-strategies', 'list']);
      },
    }
  );

  return {
    deleteStrategy: deleteStrategy.mutate,
    isLoading: deleteStrategy.isPending,
    isError: deleteStrategy.isError,
    error: deleteStrategy.error,
  };
}
