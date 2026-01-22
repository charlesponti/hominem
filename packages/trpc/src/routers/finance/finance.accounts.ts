import {
  createAccount,
  deleteAccount,
  findAccountByNameForUser,
  getAccountById,
  getAccountWithPlaidInfo,
  listAccounts,
  listAccountsWithPlaidInfo,
  listAccountsWithRecentTransactions,
  listPlaidConnectionsForUser,
  updateAccount,
} from '@hominem/finance-services';
import { z } from 'zod';

import { protectedProcedure, router } from '../../procedures';

export const accountsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx }) => {
      return await listAccounts(ctx.userId);
    }),

  get: protectedProcedure.input(z.object({ id: z.uuid() })).query(async ({ input, ctx }) => {
    const account = await getAccountWithPlaidInfo(input.id, ctx.userId);

    if (!account) {
      return null;
    }

    const accountWithTransactions = await listAccountsWithRecentTransactions(ctx.userId, 5);
    const accountData = (accountWithTransactions as any[]).find((acc: any) => acc.id === account.id);

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
    .mutation(async ({ input, ctx }) => {
      // Check if account with same name already exists for user
      const existingAccount = await findAccountByNameForUser(ctx.userId, input.name);

      if (existingAccount) {
        throw new Error('Account with this name already exists');
      }

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
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;

      // Ensure exists
      const existing = await getAccountById(id, ctx.userId);
      if (!existing) {
        throw new Error('Account not found');
      }

      // If name is being changed, check if new name conflicts with existing account
      if (updates.name && updates.name !== existing.name) {
        const nameConflict = await findAccountByNameForUser(ctx.userId, updates.name);

        if (nameConflict && nameConflict.id !== id) {
          throw new Error('Another account with this name already exists');
        }
      }

      return await updateAccount(id, ctx.userId, {
        ...updates,
        balance: updates.balance?.toString(),
        institutionId: updates.institution,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ input, ctx }) => {
    const existing = await getAccountById(input.id, ctx.userId);
    if (!existing) {
      throw new Error('Account not found');
    }

    await deleteAccount(input.id, ctx.userId);
    return { success: true, message: 'Account deleted successfully' };
  }),
  all: protectedProcedure.query(async ({ ctx }) => {
    const allAccounts = await listAccountsWithPlaidInfo(ctx.userId);

    // Get recent transactions for each account using the existing service method
    const accountsWithRecentTransactions = await listAccountsWithRecentTransactions(ctx.userId, 5);
    const transactionsMap = new Map(
      (accountsWithRecentTransactions as any[]).map((acc: any) => [acc.id, acc.transactions || []]),
    );

    const accountsWithTransactions = (allAccounts as any[]).map((account: any) => {
      return {
        ...account,
        transactions: transactionsMap.get(account.id) || [],
      };
    });

    // Get Plaid connections separately starting from plaidItems table
    // This ensures we capture all Plaid connections, even those without corresponding finance accounts
    const plaidConnections = await listPlaidConnectionsForUser(ctx.userId);

    const uniqueConnections = (plaidConnections as any[]).map((connection: any) => ({
      id: connection.id,
      itemId: connection.itemId,
      institutionId: connection.institutionId,
      institutionName: connection.institutionName || 'Unknown Institution',
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
      error: connection.error,
      createdAt: connection.createdAt,
    }));

    return {
      accounts: accountsWithTransactions,
      connections: uniqueConnections,
    };
  }),
});
