import type { HonoClient } from '@hominem/hono-client';
import type {
  ApiResult,
  ContentStrategiesSelect,
  ContentStrategiesInsert,
} from '@hominem/services';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

export function useContentStrategies() {
  const query = useHonoQuery<ApiResult<ContentStrategiesSelect[]>>(
    ['content-strategies', 'list'],
    async (client) => {
      const res = await client.api['content-strategies'].$get();
      return res.json();
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  );

  const strategies = query.data?.success ? query.data.data : [];

  return {
    strategies,
    isLoading: query.isLoading,
    error: query.error,
    count: strategies.length,
  };
}

export function useContentStrategy(strategyId: string) {
  const query = useHonoQuery<ApiResult<ContentStrategiesSelect>>(
    ['content-strategies', strategyId],
    async (client) => {
      const res = await client.api['content-strategies'][':id'].$get({
        param: { id: strategyId },
      });
      return res.json();
    },
    {
      enabled: !!strategyId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  );

  const strategy = query.data?.success ? query.data.data : null;

  return {
    strategy,
    isLoading: query.isLoading,
    error: query.error,
    found: !!strategy,
  };
}

export function useCreateContentStrategy() {
  const utils = useHonoUtils();

  const createStrategy = useHonoMutation<
    ApiResult<ContentStrategiesSelect>,
    Omit<ContentStrategiesInsert, 'userId' | 'id' | 'createdAt' | 'updatedAt'>
  >(
    async (client, variables) => {
      const res = await client.api['content-strategies'].$post({
        json: {
          ...variables,
          description: variables.description ?? undefined,
        },
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['content-strategies', 'list']);
      },
    },
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

  const updateStrategy = useHonoMutation<
    ApiResult<ContentStrategiesSelect>,
    ContentStrategiesInsert & { id: string }
  >(
    async (client, variables) => {
      const { id, ...data } = variables;
      const res = await client.api['content-strategies'][':id'].$patch({
        param: { id },
        json: {
          ...data,
          description: data.description ?? undefined,
        },
      });
      return res.json();
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          utils.invalidate(['content-strategies', 'list']);
          utils.invalidate(['content-strategies', result.data.id]);
        }
      },
    },
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
        param: { id: variables.id },
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['content-strategies', 'list']);
      },
    },
  );

  return {
    deleteStrategy: deleteStrategy.mutate,
    isLoading: deleteStrategy.isPending,
    isError: deleteStrategy.isError,
    error: deleteStrategy.error,
  };
}
