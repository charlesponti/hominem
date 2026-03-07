import * as z from 'zod';

export const FINANCE_TRANSACTION_ENTITY_TYPE = 'finance_transaction';

export const financeTransactionTagFilterSchema = z.object({
  tagIds: z.array(z.uuid()).optional(),
  tagNames: z.array(z.string().min(1)).optional(),
});

export const financeTransactionQueryContractSchema = z.object({
  userId: z.uuid(),
  accountId: z.uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
  tagIds: z.array(z.uuid()).optional(),
  tagNames: z.array(z.string().min(1)).optional(),
});

export const replaceFinanceTransactionTagsSchema = z.object({
  userId: z.uuid(),
  transactionId: z.uuid(),
  tagIds: z.array(z.uuid()),
});

export type FinanceTransactionTagFilter = z.infer<typeof financeTransactionTagFilterSchema>;
export type FinanceTransactionQueryContract = z.infer<typeof financeTransactionQueryContractSchema>;
export type ReplaceFinanceTransactionTagsInput = z.infer<
  typeof replaceFinanceTransactionTagsSchema
>;
