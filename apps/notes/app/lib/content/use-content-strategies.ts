import type { ContentStrategiesListOutput } from '@hominem/hono-rpc/types';
import { useHonoQuery } from '@hominem/hono-client/react';

export function useContentStrategies() {
  const {
    data: strategies,
    isLoading,
    error,
  } = useHonoQuery<ContentStrategiesListOutput>(
    ['content-strategies', 'list'],
    async (client) => {
      const res = await client.api['content-strategies'].$get();
      return res.json() as Promise<ContentStrategiesListOutput>;
    },
  );

  const strategiesList = Array.isArray(strategies) ? strategies : [];

  return {
    strategies: strategiesList,
    isLoading,
    error,
  };
}
