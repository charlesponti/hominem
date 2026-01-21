import { FinanceAccountSchema, accountTypeEnum } from '@hominem/db/schema';
import { z } from 'zod';

// Generic success response schema
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const accountTypeSchema = z.enum(accountTypeEnum.enumValues);

// Account Schemas
export const createFinanceAccountInputSchema = z.object({
  name: z.string(),
  type: accountTypeSchema,
  balance: z.number().optional(),
  currency: z.string().optional(),
});

export const getFinanceAccountsInputSchema = z.object({
  type: accountTypeSchema.optional(),
});

export const getFinanceAccountsOutputSchema = z.object({
  accounts: z.array(FinanceAccountSchema),
  total: z.number(),
});

export const updateFinanceAccountInputSchema = z.object({
  accountId: z.string(),
  name: z.string().optional(),
  type: accountTypeSchema.optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
});

export const deleteFinanceAccountInputSchema = z.object({
  accountId: z.string(),
});
export const deleteFinanceAccountOutputSchema = SuccessResponseSchema;
