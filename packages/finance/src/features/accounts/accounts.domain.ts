import type { FinanceAccount, FinanceAccountInsert, AccountType } from '@hominem/db/schema/finance';

import { z } from 'zod';

/**
 * Domain-aligned Finance Account Schema derived from Database Schema.
 */
export const FinanceAccountSchema = z.object({
  id: z.string().uuid(),
  type: z.string() as z.ZodType<AccountType>,
  balance: z.string().or(z.number()),
  interestRate: z.string().or(z.number()).nullable().optional(),
  minimumPayment: z.string().or(z.number()).nullable().optional(),
  name: z.string(),
  mask: z.string().nullable().optional(),
  isoCurrencyCode: z.string().nullable().optional().default('USD'),
  subtype: z.string().nullable().optional(),
  officialName: z.string().nullable().optional(),
  limit: z.string().or(z.number()).nullable().optional(),
  meta: z.unknown().nullable().optional(),
  lastUpdated: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  institutionId: z.string().nullable().optional(),
  plaidItemId: z.string().uuid().nullable().optional(),
  plaidAccountId: z.string().nullable().optional(),
  userId: z.string().uuid(),
});

export type FinanceAccountOutput = FinanceAccount;

/**
 * Input schema for creating a new account
 */
export const CreateAccountSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.string() as z.ZodType<AccountType>,
  balance: z.string().or(z.number()),
  interestRate: z.string().or(z.number()).nullable().optional(),
  minimumPayment: z.string().or(z.number()).nullable().optional(),
  name: z.string(),
  mask: z.string().nullable().optional(),
  isoCurrencyCode: z.string().nullable().optional().default('USD'),
  subtype: z.string().nullable().optional(),
  officialName: z.string().nullable().optional(),
  limit: z.string().or(z.number()).nullable().optional(),
  meta: z.any().optional().nullable(),
  institutionId: z.string().nullable().optional(),
  plaidItemId: z.string().uuid().nullable().optional(),
  plaidAccountId: z.string().nullable().optional(),
  userId: z.string().uuid().optional(),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;

/**
 * Input schema for updating an account
 */
export const UpdateAccountSchema = CreateAccountSchema.partial();

// Manual type definition to satisfy exactOptionalPropertyTypes
export type UpdateAccountInput = {
  type?: CreateAccountInput['type'] | undefined;
  balance?: CreateAccountInput['balance'] | undefined;
  name?: CreateAccountInput['name'] | undefined;
  interestRate?: CreateAccountInput['interestRate'] | undefined;
  minimumPayment?: CreateAccountInput['minimumPayment'] | undefined;
  mask?: CreateAccountInput['mask'] | undefined;
  isoCurrencyCode?: CreateAccountInput['isoCurrencyCode'] | undefined;
  subtype?: CreateAccountInput['subtype'] | undefined;
  officialName?: CreateAccountInput['officialName'] | undefined;
  limit?: CreateAccountInput['limit'] | undefined;
  meta?: CreateAccountInput['meta'] | undefined;
  institutionId?: CreateAccountInput['institutionId'] | undefined;
  plaidItemId?: CreateAccountInput['plaidItemId'] | undefined;
  plaidAccountId?: CreateAccountInput['plaidAccountId'] | undefined;
  userId?: CreateAccountInput['userId'] | undefined;
};

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

/**
 * Type for balance summary
 */
export const BalanceSummarySchema = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      balance: z.string().nullable(),
    }),
  ),
  totalBalance: z.string(),
  accountCount: z.number(),
});

export type BalanceSummary = z.infer<typeof BalanceSummarySchema>;

/**
 * Type for Plaid connection info
 */
export const PlaidConnectionSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  institutionId: z.string().nullable(),
  institutionName: z.string().nullable(),
  status: z.string(),
  lastSyncedAt: z.date().nullable(),
  error: z.unknown().nullable(),
  createdAt: z.date(),
});

export type PlaidConnection = z.infer<typeof PlaidConnectionSchema>;

/**
 * Type for institution connection info with account count
 * Represents a user's connection to an institution (Plaid or manual)
 * Includes account count for better UX
 */
export const InstitutionConnectionSchema = z.object({
  institutionId: z.string(),
  institutionName: z.string(),
  institutionLogo: z.string().nullable(),
  institutionUrl: z.string().nullable(),
  status: z.enum(['active', 'error', 'pending_expiration', 'revoked']),
  lastSyncedAt: z.date().nullable(),
  error: z.unknown().nullable(),
  accountCount: z.number(),
  isPlaidConnected: z.boolean(),
});

export type InstitutionConnection = z.infer<typeof InstitutionConnectionSchema>;
