import type { AccountWithPlaidInfo } from '@hominem/finance-services';

import { z } from 'zod';

import type { AccountData, PlaidConnection, TransactionData } from './shared.types';

// ============================================================================
// Accounts
// ============================================================================

export type AccountListInput = {
  includeInactive?: boolean;
};

export const accountListSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

export type AccountGetInput = {
  id: string;
};

export const accountGetSchema = z.object({
  id: z.string().uuid(),
});

export type AccountCreateInput = {
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'credit';
  balance?: number;
  institution?: string;
};

export const accountCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['checking', 'savings', 'investment', 'credit']),
  balance: z.number().optional(),
  institution: z.string().optional(),
});

export type AccountUpdateInput = {
  id: string;
  name?: string;
  type?: 'checking' | 'savings' | 'investment' | 'credit';
  balance?: number;
  institution?: string;
};

export const accountUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  type: z.enum(['checking', 'savings', 'investment', 'credit']).optional(),
  balance: z.number().optional(),
  institution: z.string().optional(),
});

export type AccountDeleteInput = {
  id: string;
};

export const accountDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type AccountInstitutionAccountsInput = {
  institutionId: string;
};

export const institutionAccountsSchema = z.object({
  institutionId: z.string(),
});

export type AccountListOutput = AccountData[];

export type AccountGetOutput = AccountWithPlaidInfo & {
  transactions: TransactionData[];
};

export type AccountCreateOutput = AccountData;
export type AccountUpdateOutput = AccountData;
export type AccountDeleteOutput = { success: true };

export type AccountAllOutput = {
  accounts: (AccountWithPlaidInfo & { transactions: TransactionData[] })[];
  connections: PlaidConnection[];
};

export type AccountsWithPlaidOutput = AccountWithPlaidInfo[];
export type AccountConnectionsOutput = PlaidConnection[];
export type AccountInstitutionAccountsOutput = AccountWithPlaidInfo[];
