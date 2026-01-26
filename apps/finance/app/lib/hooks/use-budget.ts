import type {
  BudgetCategoriesListOutput,
  BudgetCategoryCreateInput,
  BudgetCategoryCreateOutput,
  BudgetCategoryData,
  BudgetCategoryUpdateInput,
  BudgetCategoryUpdateOutput,
  BudgetCategoryGetOutput,
  BudgetCategoryDeleteOutput,
  BudgetTrackingInput,
  BudgetTrackingOutput,
  BudgetHistoryInput,
  BudgetHistoryOutput,
  BudgetCalculateInput,
  BudgetCalculateOutput,
  BudgetBulkCreateInput,
  BudgetBulkCreateOutput,
  TransactionCategoryAnalysisOutput,
  RunwayCalculateOutput,
} from '@hominem/hono-rpc/types/finance.types';

export const useTransactionCategories = () =>
  useHonoQuery(['finance', 'budget', 'transaction-categories'], async (client) => {
    const res = await client.api.finance.budget['transaction-categories'].$post({ json: {} });
    return res.json();
  });

import { useHonoQuery, useHonoMutation, useHonoUtils } from '~/lib/hono';

// Query hooks
export const useBudgetCategories = () =>
  useHonoQuery(['finance', 'budget', 'categories', 'list'], async (client) => {
    const res = await client.api.finance.budget.categories.list.$post({ json: {} });
    return res.json();
  });

export const useBudgetCategoriesWithSpending = (monthYear: string) =>
  useHonoQuery(
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
  useHonoQuery(
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
  useHonoQuery(
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
  useHonoQuery(['finance', 'budget', 'history', params.months], async (client) => {
    const res = await client.api.finance.budget.history.$post({
      json: { months: params.months },
    });
    return res.json();
  });

// Mutation hooks
export const useCreateBudgetCategory = () => {
  const utils = useHonoUtils();

  return useHonoMutation(
    async (client, variables: BudgetCategoryCreateInput) => {
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

  return useHonoMutation(
    async (client, variables: BudgetCategoryUpdateInput) => {
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

  return useHonoMutation(
    async (client, variables: { id: string }) => {
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

  return useHonoMutation(
    async (client, variables: BudgetBulkCreateInput) => {
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

  return useHonoMutation(
    async (client, variables: BudgetCalculateInput | undefined) => {
      const res = await client.api.finance.budget.calculate.$post({
        json: variables,
      });
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
