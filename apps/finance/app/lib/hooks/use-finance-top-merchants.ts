import type { TopMerchantsOutput } from '@hominem/hono-rpc/types/finance.types';

import { useHonoQuery } from '../hono';

type UseFinanceTopMerchantsParams = {
  from?: string;
  to?: string;
  account?: string;
  category?: string;
  limit?: number;
};

export function useFinanceTopMerchants({
  from,
  to,
  account,
  category,
  limit,
}: UseFinanceTopMerchantsParams) {
  return useHonoQuery<TopMerchantsOutput>(
    ['finance', 'analyze', 'top-merchants', { from, to, account, category, limit }],
    async (client) => {
      const res = await client.api.finance.analyze['top-merchants'].$post({
        json: {
          from,
          to,
          account,
          category,
          limit,
        },
      });
      return res.json() as Promise<TopMerchantsOutput>;
    },
    {
      staleTime: 5 * 60 * 1000,
    },
  );
}
