import type {
  BudgetCategoriesListOutput,
  BudgetHistoryOutput,
  BudgetCalculateInput,
  BudgetCalculateOutput,
  TransactionCategoryAnalysisOutput,
} from '@hominem/hono-rpc/types/finance.types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

const BUDGET_API_UNAVAILABLE_MESSAGE = 'Budget write endpoints are unavailable';

function rejectBudgetMutation<T>(): Promise<T> {
  return Promise.reject(new Error(BUDGET_API_UNAVAILABLE_MESSAGE));
}

export const useTransactionCategories = () =>
  useHonoQuery<TransactionCategoryAnalysisOutput>(
    ['finance', 'budget', 'transaction-categories'],
    async () => [],
  );

export const useBudgetCategories = () =>
  useHonoQuery<BudgetCategoriesListOutput>(
    ['finance', 'budget', 'categories', 'list'],
    async ({ finance }) => {
      const categories = await finance.listTags();
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

export const useBudgetHistory = (params: { months: number }) =>
  useHonoQuery<BudgetHistoryOutput>(
    ['finance', 'budget', 'history', params.months],
    async () => [],
  );

export const useCalculateBudget = (options?: { onError?: (error: Error) => void }) => {
  const utils = useHonoUtils();

  return useHonoMutation<BudgetCalculateOutput, BudgetCalculateInput | undefined>(
    async () => rejectBudgetMutation<BudgetCalculateOutput>(),
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'calculate']);
      },
      ...(options?.onError && { onError: options.onError }),
    },
  );
};
