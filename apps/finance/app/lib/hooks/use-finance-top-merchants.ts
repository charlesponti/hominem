import { trpc } from '../trpc';

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
  return trpc.finance.analyze.topMerchants.useQuery(
    {
      from,
      to,
      account,
      category,
      limit,
    },
    {
      staleTime: 5 * 60 * 1000,
    },
  );
}
