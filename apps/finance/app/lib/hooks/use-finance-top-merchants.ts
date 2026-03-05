import type { TopMerchantsOutput } from '@hominem/hono-rpc/types/finance.types';

import { useHonoQuery } from '~/lib/api';

type UseFinanceTopMerchantsParams = {
  from?: string | undefined;
  to?: string | undefined;
  account?: string | undefined;
  tag?: string | undefined;
  limit?: number | undefined;
};

export function useFinanceTopMerchants({
  from,
  to,
  account,
  tag,
  limit,
}: UseFinanceTopMerchantsParams) {
  return useHonoQuery<TopMerchantsOutput>(
    ['finance', 'analyze', 'top-merchants', { from, to, account, tag, limit }],
    async (client) => {
      const res = await client.api.finance.analyze['top-merchants'].$post({
        json: {
          from,
          to,
          account,
          tag,
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
