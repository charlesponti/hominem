import type { BudgetCategoriesListOutput } from '@hominem/rpc/finance';

import { useHonoQuery } from '~/lib/api';

export const useBudgetCategories = () =>
  useHonoQuery<BudgetCategoriesListOutput>(
    ['finance', 'budget', 'categories', 'list'],
    async ({ finance }) => {
      const categories = await finance.tags.list.$get({ query: {} }).then((r) => r.json());
      return categories.map((category) => {
        const normalized = {
          id: category.id,
          userId: category.userId,
          name: category.name,
        };
        return typeof category.color === 'string'
          ? { ...normalized, color: category.color }
          : normalized;
      });
    },
  );
