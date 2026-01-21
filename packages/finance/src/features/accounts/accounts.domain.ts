import {
  FinanceAccountSchema as DbFinanceAccountSchema,
  FinanceAccountInsertSchema as DbFinanceAccountInsertSchema,
} from '@hominem/db/schema';
import { z } from 'zod';

/**
 * Domain-aligned Finance Account Schema derived from Database Schema.
 */
export const FinanceAccountSchema = DbFinanceAccountSchema.extend({
  isoCurrencyCode: z.string().nullable().default('USD'),
});

export type FinanceAccount = z.infer<typeof FinanceAccountSchema>;

/**
 * Input schema for creating a new account
 */
export const CreateAccountSchema = DbFinanceAccountInsertSchema.extend({
  isoCurrencyCode: z.string().nullable().default('USD'),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;

/**
 * Input schema for updating an account
 */
export const UpdateAccountSchema = CreateAccountSchema.partial();
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;

/**
 * Extended type with Plaid/Institution info
 */
export const AccountWithPlaidInfoSchema = FinanceAccountSchema.extend({
  institutionName: z.string().nullable(),
  institutionLogo: z.string().nullable(),
  isPlaidConnected: z.boolean(),
  plaidItemStatus: z.string().nullable(),
  plaidItemError: z.unknown().nullable(),
  plaidLastSyncedAt: z.date().nullable(),
  plaidItemInternalId: z.string().nullable(),
  plaidInstitutionId: z.string().nullable(),
  plaidInstitutionName: z.string().nullable(),
});

export type AccountWithPlaidInfo = z.infer<typeof AccountWithPlaidInfoSchema>;
