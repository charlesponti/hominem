import type { TopMerchantsOutput } from '@hominem/rpc/types/finance.types';

import { useRpcQuery } from '@hominem/rpc/react';

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
  return useRpcQuery(
    ({ finance }) =>
      finance.getTopMerchants({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(account ? { account } : {}),
        ...(tag ? { tag } : {}),
        ...(typeof limit === 'number' ? { limit } : {}),
      }),
    {
      queryKey: ['finance', 'analyze', 'top-merchants', { from, to, account, tag, limit }],
      staleTime: 5 * 60 * 1000,
    },
  );
}
