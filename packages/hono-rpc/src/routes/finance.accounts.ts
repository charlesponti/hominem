import {
  listAccounts,
  getAccountWithPlaidInfo,
  listAccountsWithRecentTransactions,
  createAccount,
  updateAccount,
  deleteAccount,
  listAccountsWithPlaidInfo,
  listPlaidConnectionsForUser,
  getAccountsForInstitution,
} from '@hominem/finance-services';
import type { AccountType } from '@hominem/db/types/finance';
import { NotFoundError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import {
  accountCreateSchema,
  accountDeleteSchema,
  accountGetSchema,
  accountListSchema,
  accountUpdateSchema,
  institutionAccountsSchema,
} from '../schemas/finance.accounts.schema'
import type {
  AccountAllOutput,
  AccountConnectionsOutput,
  AccountCreateOutput,
  AccountDeleteOutput,
  AccountGetOutput,
  AccountInstitutionAccountsOutput,
  AccountListOutput,
  AccountUpdateOutput,
  AccountsWithPlaidOutput,
  TransactionData,
} from '../types/finance.types'

/**
 * No serialization helpers needed!
 * Database types are returned directly - timestamps already as strings.
 */

/**
 * Finance Accounts Routes
 */
export const accountsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /list - ListOutput accounts
  .post('/list', zValidator('json', accountListSchema), async (c) => {
    const userId = c.get('userId')!;
    const accounts = await listAccounts(userId);
    return c.json<AccountListOutput>(accounts, 200);
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
      ...account,
      transactions: accountData?.transactions || [],
    };

    return c.json<AccountGetOutput>(result, 200);
  })

   // POST /create - Create account
   .post('/create', zValidator('json', accountCreateSchema), async (c) => {
     const input = c.req.valid('json') as z.infer<typeof accountCreateSchema>;
     const userId = c.get('userId')!;

     const result = await createAccount({
       userId,
       name: input.name,
       type: input.type as AccountType,
       balance: input.balance?.toString() || '0',
       institutionId: input.institution ?? input.institutionId ?? null,
       isoCurrencyCode: 'USD',
       meta: null,
     });

     return c.json<AccountCreateOutput>(result, 201);
   })

   // POST /update - Update account
   .post('/update', zValidator('json', accountUpdateSchema), async (c) => {
     const input = c.req.valid('json') as z.infer<typeof accountUpdateSchema>;
     const userId = c.get('userId')!;
     const { id, ...updates } = input;

     const result = await updateAccount(id, userId, {
       ...updates,
       balance: updates.balance?.toString(),
       institutionId: updates.institution ?? updates.institutionId,
       type: updates.type as AccountType | undefined,
     });

     if (!result) {
       throw new NotFoundError('Account not found');
     }

     return c.json<AccountUpdateOutput>(result, 200);
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
      ...account,
      transactions: transactionsMap.get(account.id) || [],
    }));

    // Get Plaid connections
    const plaidConnections = await listPlaidConnectionsForUser(userId);

    const result = {
      accounts: accountsWithTransactions,
      connections: plaidConnections.map((conn) => ({
        id: conn.id,
        institutionId: conn.institutionId || '',
        institutionName: conn.institutionName || 'Unknown',
        institutionLogo: null,
        status: (conn.status || 'active') as 'active' | 'error' | 'disconnected',
        lastSynced: conn.lastSyncedAt ?? '',
        accounts: 0,
      })),
    };

    return c.json<AccountAllOutput>(result, 200);
  })

  // POST /with-plaid - Get accounts with Plaid info
  .post('/with-plaid', async (c) => {
    const userId = c.get('userId')!;

    const result = await listAccountsWithPlaidInfo(userId);
    return c.json<AccountsWithPlaidOutput>(result, 200);
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
        status: (conn.status || 'active') as 'active' | 'error' | 'disconnected',
        lastSynced: conn.lastSyncedAt ?? '',
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
    return c.json<AccountInstitutionAccountsOutput>(result, 200);
  });
