import type { ApiResult, ContentStrategiesSelect } from '@hominem/services';
import { useHonoQuery } from '@hominem/hono-client/react';

type ContentStrategiesResult = ApiResult<ContentStrategiesSelect[]>;

export function useContentStrategies() {
  const {
    data: strategiesResult,
    isLoading,
    error,
  } = useHonoQuery<ContentStrategiesResult>(
    ['content-strategies', 'list'],
    async (client) => {
      // Route is GET /api/content-strategies
      const res = await client.api['content-strategies'].$get();
      return res.json();
    },
  );

  const strategies = strategiesResult?.success ? strategiesResult.data : [];

  return {
    strategies,
    isLoading,
    error,
  };
}
