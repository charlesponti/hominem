import {
  FinanceAccountSchema as DbFinanceAccountSchema,
  FinanceAccountInsertSchema as DbFinanceAccountInsertSchema,
} from '@hominem/db/types/finance';
import { z } from 'zod';

/**
 * Domain-aligned Finance Account Schema derived from Database Schema.
 */
export const FinanceAccountSchema = DbFinanceAccountSchema.extend({
  isoCurrencyCode: z.string().nullable().default('USD'),
});

export type FinanceAccountOutput = z.infer<typeof FinanceAccountSchema>;

/**
 * Input schema for creating a new account
 */
export const CreateAccountSchema = DbFinanceAccountInsertSchema.extend({
  isoCurrencyCode: z.string().nullable().default('USD'),
  meta: z.any().optional().nullable(),
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
