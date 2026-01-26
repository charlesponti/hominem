import {
  listAccounts,
  getAccountWithPlaidInfo,
  listAccountsWithRecentTransactions,
  createAccount,
  updateAccount,
  deleteAccount,
  listAccountsWithPlaidInfo,
  listPlaidConnectionsForUser,
  listInstitutionConnections,
  getAccountsForInstitution,
} from '@hominem/finance-services';
import { error, success, isServiceError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  accountListSchema,
  accountGetSchema,
  accountCreateSchema,
  accountUpdateSchema,
  accountDeleteSchema,
  institutionAccountsSchema,
  type AccountData,
  type AccountListOutput,
  type AccountGetOutput,
  type AccountCreateOutput,
  type AccountUpdateOutput,
  type AccountDeleteOutput,
  type AccountAllOutput,
  type AccountsWithPlaidOutput,
  type AccountConnectionsOutput,
  type AccountInstitutionAccountsOutput,
  type TransactionData,
} from '../types/finance.types';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Serialization Helpers
 */
function serializeAccount(account: any): AccountData {
  return {
    ...account,
    createdAt: typeof account.createdAt === 'string' ? account.createdAt : account.createdAt.toISOString(),
    updatedAt: typeof account.updatedAt === 'string' ? account.updatedAt : account.updatedAt.toISOString(),
    lastUpdated: account.lastUpdated ? (typeof account.lastUpdated === 'string' ? account.lastUpdated : account.lastUpdated.toISOString()) : null,
    balance: typeof account.balance === 'number' ? account.balance : parseFloat(account.balance?.toString() || '0'),
  };
}

function serializeTransaction(t: any): TransactionData {
  return {
    ...t,
    date: typeof t.date === 'string' ? t.date : t.date.toISOString(),
    authorizedDate: t.authorizedDate ? (typeof t.authorizedDate === 'string' ? t.authorizedDate : t.authorizedDate.toISOString()) : null,
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toISOString(),
    updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : t.updatedAt.toISOString(),
    amount: typeof t.amount === 'number' ? t.amount : parseFloat(t.amount?.toString() || '0'),
  };
}

/**
 * Finance Accounts Routes
 */
export const accountsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /list - List accounts
  .post('/list', zValidator('json', accountListSchema), async (c) => {
    const userId = c.get('userId')!;

    try {
      const accounts = await listAccounts(userId);
      return c.json<AccountListOutput>(success(accounts.map(serializeAccount)), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<AccountListOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error listing accounts:', err);
      return c.json<AccountListOutput>(error('INTERNAL_ERROR', 'Failed to list accounts'), 500);
    }
  })

  // POST /get - Get single account
  .post('/get', zValidator('json', accountGetSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof accountGetSchema>;
    const userId = c.get('userId')!;

    try {
      const account = await getAccountWithPlaidInfo(input.id, userId);

      if (!account) {
        return c.json<AccountGetOutput>(error('NOT_FOUND', 'Account not found'), 404);
      }

      const accountWithTransactions = await listAccountsWithRecentTransactions(userId, 5);
      const accountData = accountWithTransactions.find((acc) => acc.id === account.id);

      const result = {
        ...serializeAccount(account),
        transactions: (accountData?.transactions || []).map(serializeTransaction),
      };

      return c.json<AccountGetOutput>(success(result as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<AccountGetOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting account:', err);
      return c.json<AccountGetOutput>(error('INTERNAL_ERROR', 'Failed to get account'), 500);
    }
  })

  // POST /create - Create account
  .post('/create', zValidator('json', accountCreateSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof accountCreateSchema>;
    const userId = c.get('userId')!;

    try {
      const result = await createAccount({
        userId,
        name: input.name,
        type: input.type,
        balance: input.balance?.toString() || '0',
        institutionId: input.institution || null,
        isoCurrencyCode: 'USD',
        meta: null,
      });

      return c.json<AccountCreateOutput>(success(serializeAccount(result)), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<AccountCreateOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error creating account:', err);
      return c.json<AccountCreateOutput>(error('INTERNAL_ERROR', 'Failed to create account'), 500);
    }
  })

  // POST /update - Update account
  .post('/update', zValidator('json', accountUpdateSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof accountUpdateSchema>;
    const userId = c.get('userId')!;
    const { id, ...updates } = input;

    try {
      const result = await updateAccount(id, userId, {
        ...updates,
        balance: updates.balance?.toString(),
        institutionId: updates.institution,
      });

      if (!result) {
        return c.json<AccountUpdateOutput>(error('NOT_FOUND', 'Account not found'), 404);
      }

      return c.json<AccountUpdateOutput>(success(serializeAccount(result)), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<AccountUpdateOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error updating account:', err);
      return c.json<AccountUpdateOutput>(error('INTERNAL_ERROR', 'Failed to update account'), 500);
    }
  })

  // POST /delete - Delete account
  .post('/delete', zValidator('json', accountDeleteSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof accountDeleteSchema>;
    const userId = c.get('userId')!;

    try {
      await deleteAccount(input.id, userId);
      return c.json<AccountDeleteOutput>(success({ success: true }), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<AccountDeleteOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error deleting account:', err);
      return c.json<AccountDeleteOutput>(error('INTERNAL_ERROR', 'Failed to delete account'), 500);
    }
  })

  // POST /all - Get all accounts with connections
  .post('/all', async (c) => {
    const userId = c.get('userId')!;

    try {
      const allAccounts = await listAccountsWithPlaidInfo(userId);

      // Get recent transactions for each account
      const accountsWithRecentTransactions = await listAccountsWithRecentTransactions(userId, 5);
      const transactionsMap = new Map(
        accountsWithRecentTransactions.map((acc) => [acc.id, acc.transactions || []]),
      );

      const accountsWithTransactions = allAccounts.map((account) => ({
        ...serializeAccount(account),
        transactions: (transactionsMap.get(account.id) || []).map(serializeTransaction),
      }));

      // Get Plaid connections
      const plaidConnections = await listPlaidConnectionsForUser(userId);

      const result = {
        accounts: accountsWithTransactions,
        connections: plaidConnections.map(conn => ({
          ...conn,
          lastSynced: typeof conn.lastSynced === 'string' ? conn.lastSynced : (conn.lastSynced as any).toISOString(),
        })),
      };

      return c.json<AccountAllOutput>(success(result as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<AccountAllOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting all accounts:', err);
      return c.json<AccountAllOutput>(error('INTERNAL_ERROR', 'Failed to get all accounts'), 500);
    }
  })

  // POST /with-plaid - Get accounts with Plaid info
  .post('/with-plaid', async (c) => {
    const userId = c.get('userId')!;

    try {
      const result = await listAccountsWithPlaidInfo(userId);
      return c.json<AccountsWithPlaidOutput>(success(result.map(serializeAccount)), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<AccountsWithPlaidOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting accounts with Plaid:', err);
      return c.json<AccountsWithPlaidOutput>(error('INTERNAL_ERROR', 'Failed to get accounts with Plaid'), 500);
    }
  })

  // POST /connections - Get institution connections
  .post('/connections', async (c) => {
    const userId = c.get('userId')!;

    try {
      const result = await listPlaidConnectionsForUser(userId);
      return c.json<AccountConnectionsOutput>(success(result.map(conn => ({
        ...conn,
        lastSynced: typeof conn.lastSynced === 'string' ? conn.lastSynced : (conn.lastSynced as any).toISOString(),
      }))), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<AccountConnectionsOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting connections:', err);
      return c.json<AccountConnectionsOutput>(error('INTERNAL_ERROR', 'Failed to get connections'), 500);
    }
  })

  // POST /institution-accounts - Get accounts for institution
  .post('/institution-accounts', zValidator('json', institutionAccountsSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof institutionAccountsSchema>;
    const userId = c.get('userId')!;

    try {
      const result = await getAccountsForInstitution(userId, input.institutionId);
      return c.json<AccountInstitutionAccountsOutput>(success(result.map(serializeAccount)), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<AccountInstitutionAccountsOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting institution accounts:', err);
      return c.json<AccountInstitutionAccountsOutput>(error('INTERNAL_ERROR', 'Failed to get institution accounts'), 500);
    }
  });
