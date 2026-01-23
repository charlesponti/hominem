import type {
  BudgetCategoriesListOutput,
  BudgetCategoryCreateInput,
  BudgetCategoryUpdateInput,
  BudgetCategoryGetOutput,
} from '@hominem/hono-rpc/types/finance.types';

import { useHonoQuery, useHonoMutation, useHonoUtils } from '~/lib/hono';

// Query hooks
export const useBudgetCategories = () =>
  useHonoQuery<BudgetCategoriesListOutput>(
    ['finance', 'budget', 'categories', 'list'],
    async (client) => {
      const res = await client.api.finance.budget.categories.list.$post({ json: {} });
      return res.json();
    },
  );

export const useBudgetCategoriesWithSpending = (monthYear: string) =>
  useHonoQuery<BudgetCategoriesListOutput>(
    ['finance', 'budget', 'categories', 'list-with-spending', monthYear],
    async (client) => {
      const res = await client.api.finance.budget.categories['list-with-spending'].$post({
        json: { monthYear },
      });
      return res.json();
    },
    { enabled: !!monthYear },
  );

export const useBudgetCategory = (id: string) =>
  useHonoQuery<BudgetCategoryGetOutput>(
    ['finance', 'budget', 'categories', 'get', id],
    async (client) => {
      const res = await client.api.finance.budget.categories.get.$post({
        json: { id },
      });
      return res.json();
    },
    { enabled: !!id },
  );

export const useBudgetTracking = (monthYear: string) =>
  useHonoQuery<BudgetTrackingOutput>(
    ['finance', 'budget', 'tracking', monthYear],
    async (client) => {
      const res = await client.api.finance.budget.tracking.$post({
        json: { monthYear },
      });
      return res.json();
    },
    { enabled: !!monthYear },
  );

export const useBudgetHistory = (params: { months: number }) =>
  useHonoQuery<BudgetHistoryOutput>(
    ['finance', 'budget', 'history', params.months],
    async (client) => {
      const res = await client.api.finance.budget.history.$post({
        json: { months: params.months },
      });
      return res.json();
    },
  );

export const useTransactionCategories = () =>
  useHonoQuery<TransactionCategoriesOutput>(
    ['finance', 'budget', 'transaction-categories'],
    async (client) => {
      const res = await client.api.finance.budget['transaction-categories'].$post({ json: {} });
      return res.json();
    },
  );

// Mutation hooks
export const useCreateBudgetCategory = () => {
  const utils = useHonoUtils();

  return useHonoMutation<any, BudgetCategoryCreateInput>(
    async (client, variables) => {
      const res = await client.api.finance.budget.categories.create.$post({
        json: variables,
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'categories']);
        utils.invalidate(['finance', 'budget', 'tracking']);
        utils.invalidate(['finance', 'budget', 'history']);
      },
    },
  );
};

export const useUpdateBudgetCategory = () => {
  const utils = useHonoUtils();

  return useHonoMutation<any, BudgetCategoryUpdateInput>(
    async (client, variables) => {
      const res = await client.api.finance.budget.categories.update.$post({
        json: variables,
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'categories']);
        utils.invalidate(['finance', 'budget', 'tracking']);
        utils.invalidate(['finance', 'budget', 'history']);
      },
    },
  );
};

export const useDeleteBudgetCategory = () => {
  const utils = useHonoUtils();

  return useHonoMutation<any, { id: string }>(
    async (client, variables) => {
      const res = await client.api.finance.budget.categories.delete.$post({
        json: variables,
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'categories']);
        utils.invalidate(['finance', 'budget', 'tracking']);
        utils.invalidate(['finance', 'budget', 'history']);
      },
    },
  );
};

export const useBulkCreateBudgetCategories = () => {
  const utils = useHonoUtils();

  return useHonoMutation<any, { categories: BudgetCategoryCreateInput[] }>(
    async (client, variables) => {
      const res = await client.api.finance.budget['bulk-create'].$post({
        json: variables,
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'categories']);
        utils.invalidate(['finance', 'budget', 'tracking']);
        utils.invalidate(['finance', 'budget', 'history']);
      },
    },
  );
};

export const useCalculateBudget = (options?: { onError?: (error: Error) => void }) => {
  const utils = useHonoUtils();

  return useHonoMutation<any, void>(
    async (client) => {
      const res = await client.api.finance.budget.calculate.$post({ json: {} });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'calculate']);
      },
      onError: options?.onError,
    },
  );
};
