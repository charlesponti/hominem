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
    ({ finance }) =>
      finance.getTopMerchants({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(account ? { account } : {}),
        ...(tag ? { tag } : {}),
        ...(typeof limit === 'number' ? { limit } : {}),
      }),
    {
      staleTime: 5 * 60 * 1000,
    },
  );
}
