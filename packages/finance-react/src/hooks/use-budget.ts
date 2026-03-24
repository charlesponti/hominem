import { useRpcMutation, useRpcQuery } from '@hominem/rpc/react';
import type { BudgetCalculateInput, BudgetCalculateOutput } from '@hominem/rpc/types/finance.types';
import { useQueryClient } from '@tanstack/react-query';

const BUDGET_API_UNAVAILABLE_MESSAGE = 'Budget write endpoints are unavailable';

function rejectBudgetMutation<T>(): Promise<T> {
  return Promise.reject(new Error(BUDGET_API_UNAVAILABLE_MESSAGE));
}

export const useTransactionCategories = () =>
  useRpcQuery(async () => [], {
    queryKey: ['finance', 'budget', 'transaction-categories'],
  });

export const useBudgetCategories = () =>
  useRpcQuery(
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
    {
      queryKey: ['finance', 'budget', 'categories', 'list'],
    },
  );

export const useBudgetHistory = (params: { months: number }) =>
  useRpcQuery(async () => [], {
    queryKey: ['finance', 'budget', 'history', params.months],
  });

export const useCalculateBudget = (options?: { onError?: (error: Error) => void }) => {
  const queryClient = useQueryClient();

  return useRpcMutation<BudgetCalculateOutput, BudgetCalculateInput | undefined>(
    async () => rejectBudgetMutation<BudgetCalculateOutput>(),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['finance', 'budget', 'calculate'] });
      },
      ...(options?.onError && { onError: options.onError }),
    },
  );
};
