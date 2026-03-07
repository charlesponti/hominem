import { format } from 'date-fns';

import { useHonoQuery } from '~/lib/api';

type FinanceTagOption = {
  id: string;
  name: string;
};

type FinanceTagsOutput = Array<string | FinanceTagOption>;
type TagBreakdownOutput = {
  breakdown: Array<{
    tag: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  totalSpending: number;
  averagePerDay: number;
};

interface TagBreakdownParams {
  from?: Date | undefined;
  to?: Date | undefined;
  account?: string | undefined;
  tag?: string | undefined;
  limit?: number | undefined;
}

/**
 * Hook for fetching tag breakdown analytics
 */
export function useTagBreakdown({ from, to, account, tag, limit = 5 }: TagBreakdownParams) {
  return useHonoQuery<TagBreakdownOutput>(
    [
      'finance',
      'analyze',
      'tag-breakdown',
      {
        from: from?.toISOString(),
        to: to?.toISOString(),
        account,
        tag,
        limit,
      },
    ],
    async (client) => {
      const res = await client.api.finance.analyze['tag-breakdown'].$post({
        json: {
          from: from ? format(from, 'yyyy-MM-dd') : undefined,
          to: to ? format(to, 'yyyy-MM-dd') : undefined,
          tag,
          limit: limit.toString(),
        },
      });
      return res.json() as Promise<TagBreakdownOutput>;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );
}

/**
 * Hook for fetching list of finance tags
 */
export function useFinanceTags() {
  return useHonoQuery<FinanceTagsOutput>(
    ['finance', 'tags', 'list'],
    async (client) => {
      const res = await client.api.finance.tags.list.$post({
        json: {},
      });
      return res.json() as Promise<FinanceTagsOutput>;
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes - tags don't change often
    },
  );
}
