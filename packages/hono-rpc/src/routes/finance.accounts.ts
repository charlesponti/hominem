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
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import type {
  AccountListOutput,
  AccountGetOutput,
  AccountCreateOutput,
  AccountUpdateOutput,
  AccountDeleteOutput,
  AccountAllOutput,
  AccountsWithPlaidOutput,
  AccountConnectionsOutput,
  AccountInstitutionAccountsOutput,
} from '../types/finance.types';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Finance Accounts Routes
 *
 * Handles all account-related operations:
 * - POST /list - List user's accounts
 * - POST /get - Get single account with transactions
 * - POST /create - Create new account
 * - POST /update - Update existing account
 * - POST /delete - Delete account
 * - POST /all - Get all accounts with connections
 * - POST /with-plaid - Get accounts with Plaid info
 * - POST /connections - Get institution connections
 * - POST /institution-accounts - Get accounts for specific institution
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const accountListSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

const accountGetSchema = z.object({
  id: z.uuid(),
});

const accountCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['checking', 'savings', 'investment', 'credit']),
  balance: z.number().optional(),
  institution: z.string().optional(),
});

const accountUpdateSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  type: z.enum(['checking', 'savings', 'investment', 'credit']).optional(),
  balance: z.number().optional(),
  institution: z.string().optional(),
});

const accountDeleteSchema = z.object({
  id: z.uuid(),
});

const institutionAccountsSchema = z.object({
  institutionId: z.string(),
});

// Export schemas for type derivation
export {
  accountListSchema,
  accountGetSchema,
  accountCreateSchema,
  accountUpdateSchema,
  accountDeleteSchema,
  institutionAccountsSchema,
};

// ============================================================================
// Routes
// ============================================================================

export const accountsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /list - List accounts
  .post('/list', zValidator('json', accountListSchema), async (c) => {
    const userId = c.get('userId')!;

    try {
      const accounts = await listAccounts(userId);
      const result = accounts.map((account) => ({
        ...account,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        lastUpdated: account.lastUpdated?.toISOString() || null,
      }));
      return c.json(result as AccountListOutput);
    } catch (error) {
      console.error('Error listing accounts:', error);
      return c.json({ error: 'Failed to list accounts' }, 500);
    }
  })

  // POST /get - Get single account
  .post('/get', zValidator('json', accountGetSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const account = await getAccountWithPlaidInfo(input.id, userId);

      if (!account) {
        return c.json({ error: 'Account not found' }, 404);
      }

      const accountWithTransactions = await listAccountsWithRecentTransactions(userId, 5);
      const accountData = accountWithTransactions.find((acc) => acc.id === account.id);

      const result = {
        ...account,
        transactions: accountData?.transactions || [],
      };

      return c.json(result);
    } catch (error) {
      console.error('Error getting account:', error);
      return c.json({ error: 'Failed to get account' }, 500);
    }
  })

  // POST /create - Create account
  .post('/create', zValidator('json', accountCreateSchema), async (c) => {
    const input = c.req.valid('json');
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

      return c.json(result);
    } catch (error) {
      console.error('Error creating account:', error);
      return c.json({ error: 'Failed to create account' }, 500);
    }
  })

  // POST /update - Update account
  .post('/update', zValidator('json', accountUpdateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const { id, ...updates } = input;

    try {
      const result = await updateAccount(id, userId, {
        ...updates,
        balance: updates.balance?.toString(),
        institutionId: updates.institution,
      });

      return c.json(result);
    } catch (error) {
      console.error('Error updating account:', error);
      return c.json({ error: 'Failed to update account' }, 500);
    }
  })

  // POST /delete - Delete account
  .post('/delete', zValidator('json', accountDeleteSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      await deleteAccount(input.id, userId);
      const result = {
        success: true,
        message: 'Account deleted successfully',
      };

      return c.json(result);
    } catch (error) {
      console.error('Error deleting account:', error);
      return c.json({ error: 'Failed to delete account' }, 500);
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
        ...account,
        transactions: transactionsMap.get(account.id) || [],
      }));

      // Get Plaid connections
      const plaidConnections = await listPlaidConnectionsForUser(userId);

      const result = {
        accounts: accountsWithTransactions,
        connections: plaidConnections,
      };

      return c.json(result);
    } catch (error) {
      console.error('Error getting all accounts:', error);
      return c.json({ error: 'Failed to get all accounts' }, 500);
    }
  })

  // POST /with-plaid - Get accounts with Plaid info
  .post('/with-plaid', async (c) => {
    const userId = c.get('userId')!;

    try {
      const result = await listAccountsWithPlaidInfo(userId);
      return c.json(result);
    } catch (error) {
      console.error('Error getting accounts with Plaid:', error);
      return c.json({ error: 'Failed to get accounts with Plaid' }, 500);
    }
  })

  // POST /connections - Get institution connections
  .post('/connections', async (c) => {
    const userId = c.get('userId')!;

    try {
      const result = await listInstitutionConnections(userId);
      return c.json(result);
    } catch (error) {
      console.error('Error getting connections:', error);
      return c.json({ error: 'Failed to get connections' }, 500);
    }
  })

  // POST /institution-accounts - Get accounts for institution
  .post('/institution-accounts', zValidator('json', institutionAccountsSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await getAccountsForInstitution(userId, input.institutionId);
      return c.json(result);
    } catch (error) {
      console.error('Error getting institution accounts:', error);
      return c.json({ error: 'Failed to get institution accounts' }, 500);
    }
  });
