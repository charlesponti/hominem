import type { HonoClient } from '@hominem/hono-client';
import type {
  ContentStrategiesListOutput,
  ContentStrategiesGetOutput,
  ContentStrategiesCreateOutput,
  ContentStrategiesUpdateOutput,
  ContentStrategiesDeleteOutput,
  contentStrategiesCreateSchema,
  contentStrategiesUpdateSchema,
} from '@hominem/hono-rpc/types';
import type { ContentStrategiesInsert } from '@hominem/services';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';
import { z } from 'zod';

export function useContentStrategies() {
  const query = useHonoQuery<ContentStrategiesListOutput>(
    ['content-strategies', 'list'],
    async (client) => {
      const res = await client.api['content-strategies'].$get();
      return res.json() as Promise<ContentStrategiesListOutput>;
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  );

  const strategies = Array.isArray(query.data) ? query.data : [];

  return {
    strategies,
    isLoading: query.isLoading,
    error: query.error,
    count: strategies.length,
  };
}

export function useContentStrategy(strategyId: string) {
  const query = useHonoQuery<ContentStrategiesGetOutput>(
    ['content-strategies', strategyId],
    async (client) => {
      const res = await client.api['content-strategies'][':id'].$get({
        param: { id: strategyId },
      });
      return res.json() as Promise<ContentStrategiesGetOutput>;
    },
    {
      enabled: !!strategyId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  );

  const strategy = query.data ?? null;

  return {
    strategy,
    isLoading: query.isLoading,
    error: query.error,
    found: !!strategy,
  };
}

export function useCreateContentStrategy() {
  const utils = useHonoUtils();

  type CreateInput = z.infer<typeof contentStrategiesCreateSchema>;

  const createStrategy = useHonoMutation<ContentStrategiesCreateOutput, CreateInput>(
    async (client, variables) => {
      const res = await client.api['content-strategies'].$post({
        json: {
          ...variables,
          description: variables.description ?? undefined,
        },
      });
      return res.json() as Promise<ContentStrategiesCreateOutput>;
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

  type UpdateInput = z.infer<typeof contentStrategiesUpdateSchema> & { id: string };

  const updateStrategy = useHonoMutation<ContentStrategiesUpdateOutput, UpdateInput>(
    async (client, variables) => {
      const { id, ...data } = variables;
      const res = await client.api['content-strategies'][':id'].$patch({
        param: { id },
        json: {
          ...data,
          description: data.description ?? undefined,
        },
      });
      return res.json() as Promise<ContentStrategiesUpdateOutput>;
    },
    {
      onSuccess: (result) => {
        utils.invalidate(['content-strategies', 'list']);
        utils.invalidate(['content-strategies', result.id]);
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

  const deleteStrategy = useHonoMutation<ContentStrategiesDeleteOutput, { id: string }>(
    async (client: HonoClient, variables: { id: string }) => {
      const res = await client.api['content-strategies'][':id'].$delete({
        param: { id: variables.id },
      });
      return res.json() as Promise<ContentStrategiesDeleteOutput>;
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
