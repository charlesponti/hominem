import type {
  BudgetCategoriesListOutput,
  BudgetCategoryCreateInput,
  BudgetCategoryCreateOutput,
  BudgetCategoryUpdateInput,
  BudgetCategoryUpdateOutput,
  BudgetCategoryGetOutput,
  BudgetCategoryDeleteOutput,
  BudgetTrackingOutput,
  BudgetHistoryOutput,
  BudgetCalculateInput,
  BudgetCalculateOutput,
  BudgetBulkCreateInput,
  BudgetBulkCreateOutput,
  TransactionCategoryAnalysisOutput,
  BudgetCategoriesListWithSpendingOutput,
} from '@hominem/hono-rpc/types/finance.types';

import { useHonoQuery, useHonoMutation, useHonoUtils } from '~/lib/api';

export const useTransactionCategories = () => {
  const query = useHonoQuery<TransactionCategoryAnalysisOutput>(
    ['finance', 'budget', 'transaction-categories'],
    async (client) => {
      const res = await client.api.finance.budget['transaction-categories'].$post({ json: {} });
      return res.json() as Promise<TransactionCategoryAnalysisOutput>;
    },
  );

  return query;
};

// Query hooks
export const useBudgetCategories = () => {
  const query = useHonoQuery<BudgetCategoriesListOutput>(
    ['finance', 'budget', 'categories', 'list'],
    async (client) => {
      const res = await client.api.finance.budget.categories.list.$post({ json: {} });
      return res.json() as unknown as Promise<BudgetCategoriesListOutput>;
    },
  );

  return query;
};

export const useBudgetCategoriesWithSpending = (monthYear: string) => {
  const query = useHonoQuery<BudgetCategoriesListWithSpendingOutput>(
    ['finance', 'budget', 'categories', 'list-with-spending', monthYear],
    async (client) => {
      const res = await client.api.finance.budget.categories['list-with-spending'].$post({
        json: { monthYear },
      });
      return res.json() as unknown as Promise<BudgetCategoriesListWithSpendingOutput>;
    },
    { enabled: !!monthYear },
  );

  return query;
};

export const useBudgetCategory = (id: string) => {
  const query = useHonoQuery<BudgetCategoryGetOutput>(
    ['finance', 'budget', 'categories', 'get', id],
    async (client) => {
      const res = await client.api.finance.budget.categories.get.$post({
        json: { id },
      });
      return res.json() as unknown as Promise<BudgetCategoryGetOutput>;
    },
    { enabled: !!id },
  );

  return query;
};

export const useBudgetTracking = (monthYear: string) => {
  const query = useHonoQuery<BudgetTrackingOutput>(
    ['finance', 'budget', 'tracking', monthYear],
    async (client) => {
      const res = await client.api.finance.budget.tracking.$post({
        json: { monthYear },
      });
      return res.json() as unknown as Promise<BudgetTrackingOutput>;
    },
    { enabled: !!monthYear },
  );

  return query;
};

export const useBudgetHistory = (params: { months: number }) => {
  const query = useHonoQuery<BudgetHistoryOutput>(
    ['finance', 'budget', 'history', params.months],
    async (client) => {
      const res = await client.api.finance.budget.history.$post({
        json: { months: params.months },
      });
      return res.json() as unknown as Promise<BudgetHistoryOutput>;
    },
  );

  return query;
};

// Mutation hooks
export const useCreateBudgetCategory = () => {
  const utils = useHonoUtils();

  return useHonoMutation<BudgetCategoryCreateOutput, BudgetCategoryCreateInput>(
    async (client, variables: BudgetCategoryCreateInput) => {
      const res = await client.api.finance.budget.categories.create.$post({
        json: variables,
      });
      return res.json() as Promise<BudgetCategoryCreateOutput>;
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

  return useHonoMutation<BudgetCategoryUpdateOutput, BudgetCategoryUpdateInput>(
    async (client, variables: BudgetCategoryUpdateInput) => {
      const res = await client.api.finance.budget.categories.update.$post({
        json: variables,
      });
      return res.json() as Promise<BudgetCategoryUpdateOutput>;
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

  return useHonoMutation<BudgetCategoryDeleteOutput, { id: string }>(
    async (client, variables: { id: string }) => {
      const res = await client.api.finance.budget.categories.delete.$post({
        json: variables,
      });
      return res.json() as Promise<BudgetCategoryDeleteOutput>;
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

  return useHonoMutation<BudgetBulkCreateOutput, BudgetBulkCreateInput>(
    async (client, variables: BudgetBulkCreateInput) => {
      const res = await client.api.finance.budget['bulk-create'].$post({
        json: variables,
      });
      return res.json() as unknown as Promise<BudgetBulkCreateOutput>;
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

  return useHonoMutation<BudgetCalculateOutput, BudgetCalculateInput | undefined>(
    async (client, variables: BudgetCalculateInput | undefined) => {
      const res = await client.api.finance.budget.calculate.$post({
        json: variables,
      });
      return res.json() as Promise<BudgetCalculateOutput>;
    },
    {
      onSuccess: () => {
        utils.invalidate(['finance', 'budget', 'calculate']);
      },
      ...(options?.onError && { onError: options.onError }),
    },
  );
};
