import { z } from 'zod';

import type { TransactionData } from './shared.types';

// ============================================================================
// Transactions
// ============================================================================

export type TransactionListInput = {
  from?: string;
  to?: string;
  category?: string;
  min?: string;
  max?: string;
  account?: string;
  limit?: number;
  offset?: number;
  description?: string;
  search?: string;
  sortBy?: string[];
  sortDirection?: ('asc' | 'desc')[];
};

export const transactionListSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
  account: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  description: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.array(z.string()).optional(),
  sortDirection: z.array(z.enum(['asc', 'desc'])).optional(),
});

export type TransactionCreateInput = {
  accountId: string | null;
  date: string;
  amount: string;
  merchantName: string | null;
  category: string | null;
  description: string | null;
  transactionType: string | null;
  pending?: boolean;
  plaidTransactionId: string | null;
};

export type TransactionUpdateInput = {
  id: string;
  data: {
    accountId?: string;
    amount?: number;
    description?: string;
    category?: string;
    date?: string | Date;
    merchantName?: string;
    note?: string;
    tags?: string;
    excluded?: boolean;
    recurring?: boolean;
  };
};

export const transactionUpdateSchema = z.object({
  id: z.string().uuid(),
  data: z.object({
    accountId: z.string().uuid().optional(),
    amount: z.number().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    date: z.union([z.string(), z.date()]).optional(),
    merchantName: z.string().optional(),
    note: z.string().optional(),
    tags: z.string().optional(),
    excluded: z.boolean().optional(),
    recurring: z.boolean().optional(),
  }),
});

export type TransactionDeleteInput = {
  id: string;
};

export const transactionDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type TransactionListOutput = {
  data: TransactionData[];
  filteredCount: number;
  totalUserCount: number;
};

export type TransactionCreateOutput = TransactionData;
export type TransactionUpdateOutput = TransactionData;
export type TransactionDeleteOutput = { success: boolean; message?: string };
