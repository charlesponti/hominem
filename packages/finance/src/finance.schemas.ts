import type { AccountType } from '@hominem/db/types/finance';

import * as z from 'zod';
import { AccountMetadataSchema } from '@hominem/db/schema/shared';

// Generic success response schema
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// Account Schemas
export const createFinanceAccountInputSchema = z.object({
  name: z.string(),
  type: z.string() as z.ZodType<AccountType>,
  balance: z.number().optional(),
  currency: z.string().optional(),
});

export const getFinanceAccountsInputSchema = z.object({
  type: z.string().optional() as z.ZodType<AccountType | undefined>,
});

export const getFinanceAccountsOutputSchema = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      balance: z.string().or(z.number()),
      name: z.string(),
      mask: z.string().nullable().optional(),
      isoCurrencyCode: z.string().nullable().optional(),
      subtype: z.string().nullable().optional(),
      officialName: z.string().nullable().optional(),
      limit: z.string().or(z.number()).nullable().optional(),
      meta: AccountMetadataSchema.optional().nullable(),
      lastUpdated: z.date().nullable().optional(),
      createdAt: z.date(),
      updatedAt: z.date(),
      userId: z.string(),
    }),
  ),
  total: z.number(),
});

export const updateFinanceAccountInputSchema = z.object({
  accountId: z.string(),
  name: z.string().optional(),
  type: (z.string() as z.ZodType<AccountType>).optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
});

export const deleteFinanceAccountInputSchema = z.object({
  accountId: z.string(),
});
export const deleteFinanceAccountOutputSchema = SuccessResponseSchema;
