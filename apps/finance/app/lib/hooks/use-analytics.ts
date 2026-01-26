import type {
  CategoryBreakdownOutput,
  CategoriesListOutput,
} from '@hominem/hono-rpc/types/finance.types';

import { format } from 'date-fns';

import { useHonoQuery } from '../hono';

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
  return useHonoQuery<CategoryBreakdownOutput>(
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
      return res.json() as Promise<CategoryBreakdownOutput>;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );
}

/**
 * Hook for fetching list of finance categories
 */
export function useFinanceCategories() {
  return useHonoQuery<CategoriesListOutput>(
    ['finance', 'categories', 'list'],
    async (client) => {
      const res = await client.api.finance.categories.list.$post({
        json: {},
      });
      return res.json() as unknown as Promise<CategoriesListOutput>;
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
    },
  );
}
