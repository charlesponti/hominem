import type { CategoryBreakdownOutput } from '@hominem/hono-rpc/types/finance.types';

import { format } from 'date-fns';

import { useHonoQuery } from '../hono';

interface CategoryBreakdownItem {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

interface CategoryBreakdownParams {
  from?: Date;
  to?: Date;
  account?: string;
  category?: string;
  limit?: number;
}

/**
 * Hook for fetching category breakdown analytics
 */
export function useCategoryBreakdown({
  from,
  to,
  account,
  category,
  limit = 5,
}: CategoryBreakdownParams) {
  return useHonoQuery(
    [
      'finance',
      'analyze',
      'category-breakdown',
      {
        from: from?.toISOString(),
        to: to?.toISOString(),
        account,
        category,
        limit,
      },
    ],
    async (client) => {
      const res = await client.api.finance.analyze['category-breakdown'].$post({
        json: {
          from: from ? format(from, 'yyyy-MM-dd') : undefined,
          to: to ? format(to, 'yyyy-MM-dd') : undefined,
          category,
          limit: limit.toString(),
        },
      });
      return res.json();
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );
}

interface FinanceCategory {
  category: string;
}

/**
 * Hook for fetching list of finance categories
 */
export function useFinanceCategories() {
  return useHonoQuery(
    ['finance', 'categories', 'list'],
    async (client) => {
      const res = await client.api.finance.categories.list.$post({
        json: {},
      });
      return res.json();
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
    },
  );
}
