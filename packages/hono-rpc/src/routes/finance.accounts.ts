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
import { NotFoundError, ValidationError, InternalError, isServiceError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
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

/**
 * Serialization Helpers
 */
function serializeAccount(account: any): AccountData {
  return {
    ...account,
    createdAt:
      typeof account.createdAt === 'string' ? account.createdAt : account.createdAt.toISOString(),
    updatedAt:
      typeof account.updatedAt === 'string' ? account.updatedAt : account.updatedAt.toISOString(),
    lastUpdated: account.lastUpdated
      ? typeof account.lastUpdated === 'string'
        ? account.lastUpdated
        : account.lastUpdated.toISOString()
      : null,
    balance:
      typeof account.balance === 'number'
        ? account.balance
        : parseFloat(account.balance?.toString() || '0'),
  };
}

function serializeTransaction(t: any): TransactionData {
  return {
    ...t,
    date: typeof t.date === 'string' ? t.date : t.date.toISOString(),
    authorizedDate: t.authorizedDate
      ? typeof t.authorizedDate === 'string'
        ? t.authorizedDate
        : t.authorizedDate.toISOString()
      : null,
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toISOString(),
    updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : t.updatedAt.toISOString(),
    amount: typeof t.amount === 'number' ? t.amount : parseFloat(t.amount?.toString() || '0'),
  };
}

function throwServiceError(err: any): never {
  if (isServiceError(err)) {
    throw err;
  }
  throw err;
}

/**
 * Finance Accounts Routes
 */
export const accountsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /list - List accounts
  .post('/list', zValidator('json', accountListSchema), async (c) => {
    const userId = c.get('userId')!;
    const accounts = await listAccounts(userId);
    return c.json<AccountListOutput>(accounts.map(serializeAccount), 200);
  })

  // POST /get - Get single account
  .post('/get', zValidator('json', accountGetSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof accountGetSchema>;
    const userId = c.get('userId')!;

    const account = await getAccountWithPlaidInfo(input.id, userId);

    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const accountWithTransactions = await listAccountsWithRecentTransactions(userId, 5);
    const accountData = accountWithTransactions.find((acc) => acc.id === account.id);

    const result = {
      ...serializeAccount(account),
      transactions: (accountData?.transactions || []).map(serializeTransaction),
    };

    return c.json<AccountGetOutput>(result as any, 200);
  })

  // POST /create - Create account
  .post('/create', zValidator('json', accountCreateSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof accountCreateSchema>;
    const userId = c.get('userId')!;

    const result = await createAccount({
      userId,
      name: input.name,
      type: input.type,
      balance: input.balance?.toString() || '0',
      institutionId: input.institution || null,
      isoCurrencyCode: 'USD',
      meta: null,
    });

    return c.json<AccountCreateOutput>(serializeAccount(result), 201);
  })

  // POST /update - Update account
  .post('/update', zValidator('json', accountUpdateSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof accountUpdateSchema>;
    const userId = c.get('userId')!;
    const { id, ...updates } = input;

    const result = await updateAccount(id, userId, {
      ...updates,
      balance: updates.balance?.toString(),
      institutionId: updates.institution,
    });

    if (!result) {
      throw new NotFoundError('Account not found');
    }

    return c.json<AccountUpdateOutput>(serializeAccount(result), 200);
  })

  // POST /delete - Delete account
  .post('/delete', zValidator('json', accountDeleteSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof accountDeleteSchema>;
    const userId = c.get('userId')!;

    await deleteAccount(input.id, userId);
    return c.json<AccountDeleteOutput>({ success: true }, 200);
  })

  // POST /all - Get all accounts with connections
  .post('/all', async (c) => {
    const userId = c.get('userId')!;

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
      connections: plaidConnections.map((conn) => ({
        ...conn,
        lastSynced: conn.lastSyncedAt
          ? typeof conn.lastSyncedAt === 'string'
            ? conn.lastSyncedAt
            : conn.lastSyncedAt.toISOString()
          : '',
      })),
    };

    return c.json<AccountAllOutput>(result as any, 200);
  })

  // POST /with-plaid - Get accounts with Plaid info
  .post('/with-plaid', async (c) => {
    const userId = c.get('userId')!;

    const result = await listAccountsWithPlaidInfo(userId);
    return c.json<AccountsWithPlaidOutput>(result.map(serializeAccount), 200);
  })

  // POST /connections - Get institution connections
  .post('/connections', async (c) => {
    const userId = c.get('userId')!;

    const result = await listPlaidConnectionsForUser(userId);
    return c.json<AccountConnectionsOutput>(
      result.map((conn) => ({
        id: conn.id,
        institutionId: conn.institutionId || '',
        institutionName: conn.institutionName || 'Unknown',
        institutionLogo: null,
        status: conn.status as any,
        lastSynced: conn.lastSyncedAt
          ? typeof conn.lastSyncedAt === 'string'
            ? conn.lastSyncedAt
            : conn.lastSyncedAt.toISOString()
          : '',
        accounts: 0,
      })),
      200,
    );
  })

  // POST /institution-accounts - Get accounts for institution
  .post('/institution-accounts', zValidator('json', institutionAccountsSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof institutionAccountsSchema>;
    const userId = c.get('userId')!;

    const result = await getAccountsForInstitution(userId, input.institutionId);
    return c.json<AccountInstitutionAccountsOutput>(result.map(serializeAccount), 200);
  });
