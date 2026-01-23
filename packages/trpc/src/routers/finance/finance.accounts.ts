import {
  createAccount,
  deleteAccount,
  getAccountWithPlaidInfo,
  getAccountsForInstitution,
  listAccounts,
  listAccountsWithPlaidInfo,
  listAccountsWithRecentTransactions,
  listInstitutionConnections,
  listPlaidConnectionsForUser,
  updateAccount,
  type AccountWithPlaidInfo,
  type FinanceAccount,
  type InstitutionConnection,
  type PlaidConnection,
} from '@hominem/finance-services';
import { type FinanceTransaction } from '@hominem/db/schema';
import { z } from 'zod';

import { protectedProcedure, router } from '../../procedures';

/**
 * Modularized types for router outputs to prevent excessively deep type inference
 * and provide explicit types for consumers.
 */
export type AccountListOutput = FinanceAccount[];
export type AccountGetOutput = (AccountWithPlaidInfo & { transactions: FinanceTransaction[] }) | null;
export type AccountAllOutput = {
  accounts: Array<AccountWithPlaidInfo & { transactions: FinanceTransaction[] }>;
  connections: PlaidConnection[];
};

export const accountsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx }): Promise<AccountListOutput> => {
      return await listAccounts(ctx.userId);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input, ctx }): Promise<AccountGetOutput> => {
      const account = await getAccountWithPlaidInfo(input.id, ctx.userId);

      if (!account) {
        return null;
      }

      const accountWithTransactions = await listAccountsWithRecentTransactions(ctx.userId, 5);
      const accountData = accountWithTransactions.find((acc) => acc.id === account.id);

      return {
        ...account,
        transactions: accountData?.transactions || [],
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        type: z.enum(['checking', 'savings', 'investment', 'credit']),
        balance: z.number().optional(),
        institution: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }): Promise<FinanceAccount> => {
      return await createAccount({
        userId: ctx.userId,
        name: input.name,
        type: input.type,
        balance: input.balance?.toString() || '0',
        institutionId: input.institution || null,
        isoCurrencyCode: 'USD',
        meta: null,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().optional(),
        type: z.enum(['checking', 'savings', 'investment', 'credit']).optional(),
        balance: z.number().optional(),
        institution: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }): Promise<FinanceAccount> => {
      const { id, ...updates } = input;

      return await updateAccount(id, ctx.userId, {
        ...updates,
        balance: updates.balance?.toString(),
        institutionId: updates.institution,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input, ctx }) => {
      await deleteAccount(input.id, ctx.userId);
      return { success: true, message: 'Account deleted successfully' };
    }),

  all: protectedProcedure.query(async ({ ctx }): Promise<AccountAllOutput> => {
    const allAccounts = await listAccountsWithPlaidInfo(ctx.userId);

    // Get recent transactions for each account using the existing service method
    const accountsWithRecentTransactions = await listAccountsWithRecentTransactions(ctx.userId, 5);
    const transactionsMap = new Map<string, FinanceTransaction[]>(
      accountsWithRecentTransactions.map((acc) => [acc.id, acc.transactions || []]),
    );

    const accountsWithTransactions = allAccounts.map((account) => {
      return {
        ...account,
        transactions: transactionsMap.get(account.id) || [],
      };
    });

    // Get Plaid connections separately starting from plaidItems table
    const plaidConnections = await listPlaidConnectionsForUser(ctx.userId);

    return {
      accounts: accountsWithTransactions,
      connections: plaidConnections,
    };
  }),

  // Return all accounts grouped by institution
  accounts: protectedProcedure.query(async ({ ctx }): Promise<AccountWithPlaidInfo[]> => {
    return await listAccountsWithPlaidInfo(ctx.userId);
  }),

  // Return institution connections with account counts
  connections: protectedProcedure.query(
    async ({ ctx }): Promise<InstitutionConnection[]> => {
      return await listInstitutionConnections(ctx.userId);
    },
  ),

  // Get accounts for a specific institution
  institutionAccounts: protectedProcedure
    .input(z.object({ institutionId: z.string() }))
    .query(async ({ input, ctx }): Promise<AccountWithPlaidInfo[]> => {
      return await getAccountsForInstitution(ctx.userId, input.institutionId);
    }),
});
