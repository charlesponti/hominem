import { randomUUID } from 'crypto';

import {
  STEP_UP_ACTIONS,
  configureStepUpStore,
  hasRecentStepUp,
  isFreshPasskeyAuth,
} from '@hominem/auth/server';
import { db } from '@hominem/db';
import type { Database } from '@hominem/db';
import {
  accountCreateSchema,
  accountDeleteSchema,
  accountGetSchema,
  accountListSchema,
  accountUpdateSchema,
  institutionAccountsSchema,
} from '@hominem/rpc/schemas/finance.accounts.schema';
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
} from '@hominem/rpc/types/finance/accounts.types';
import type {
  AccountData,
  AccountType,
  PlaidConnection,
  TransactionData,
} from '@hominem/rpc/types/finance/shared.types';
import type { TransactionType } from '@hominem/rpc/types/finance/shared.types';
import { redis } from '@hominem/services/redis';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { Selectable } from 'kysely';
import * as z from 'zod';

import { NotFoundError } from '../errors';
import type { AppContext } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { toIsoString, toIsoStringOr } from '../utils/to-iso-string';

const emptyBodySchema = z.object({});

configureStepUpStore(redis);

function normalizeAccountType(value: string): AccountType {
  if (
    value === 'checking' ||
    value === 'savings' ||
    value === 'credit' ||
    value === 'investment' ||
    value === 'cash' ||
    value === 'other'
  ) {
    return value;
  }
  return 'other';
}

function toAccountData(row: Selectable<Database['finance_accounts']>): AccountData {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    accountType: normalizeAccountType(row.account_type),
    balance: row.balance ? Number(row.balance) : 0,
  };
}

function toTransactionData(row: Selectable<Database['finance_transactions']>): TransactionData {
  const amount =
    typeof row.amount === 'string' ? Number.parseFloat(row.amount) : Number(row.amount);
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    amount,
    description: row.description ?? '',
    date: toIsoString(row.date),
    type: (amount < 0 ? 'expense' : 'income') as TransactionType,
  };
}

function toAccountWithPlaidInfo(row: Selectable<Database['finance_accounts']>): AccountData & {
  institutionName?: string | null;
  plaidAccountId?: string | null;
} {
  return {
    ...toAccountData(row),
    institutionName: row.institution_name ?? null,
    plaidAccountId: null,
  };
}

function toPlaidConnection(
  row: Selectable<Database['plaid_items']>,
  institutionName?: string,
): PlaidConnection {
  const createdAtStr = toIsoStringOr(row.created_at, new Date(0).toISOString());

  return {
    id: row.id,
    institutionId: row.institution_id ?? '',
    institutionName: institutionName ?? 'Institution',
    institutionLogo: null,
    status: row.error ? 'error' : row.cursor ? 'disconnected' : 'active',
    lastSynced: createdAtStr,
    accounts: 0,
  };
}

// Helper to get account with ownership check
async function getAccountWithOwnershipCheck(accountId: string, userId: string) {
  const account = await db
    .selectFrom('finance_accounts')
    .selectAll()
    .where((eb) => eb.and([eb('id', '=', accountId), eb('user_id', '=', userId)]))
    .executeTakeFirst();

  if (!account) {
    throw new NotFoundError('Account not found');
  }
  return account;
}

// Helper to get transactions for an account
async function getTransactionsForAccount(
  accountId: string,
  limit: number = 200,
  offset: number = 0,
) {
  return db
    .selectFrom('finance_transactions')
    .selectAll()
    .where('account_id', '=', accountId)
    .orderBy('date', 'desc')
    .limit(limit)
    .offset(offset)
    .execute();
}

export const accountsRoutes = new Hono<AppContext>()
  .post('/list', authMiddleware, zValidator('json', accountListSchema), async (c) => {
    const userId = c.get('userId')!;
    const accounts = await db
      .selectFrom('finance_accounts')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();
    return c.json<AccountListOutput>(accounts.map(toAccountData), 200);
  })
  .post('/get', authMiddleware, zValidator('json', accountGetSchema), async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');
    const account = await getAccountWithOwnershipCheck(input.id, userId);
    const transactions = await getTransactionsForAccount(input.id, 200, 0);
    return c.json<AccountGetOutput>({
      ...toAccountWithPlaidInfo(account),
      plaidItemId: null,
      transactions: transactions.map(toTransactionData),
    });
  })
  .post('/create', authMiddleware, zValidator('json', accountCreateSchema), async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');
    const accountId = randomUUID();
    const now = new Date().toISOString();

    await db
      .insertInto('finance_accounts')
      .values({
        id: accountId,
        user_id: userId,
        name: input.name,
        account_type: normalizeAccountType(input.type),
        balance: input.balance === undefined ? 0 : Number(input.balance),
        created_at: now,
        updated_at: now,
      })
      .execute();

    const created = await db
      .selectFrom('finance_accounts')
      .selectAll()
      .where('id', '=', accountId)
      .executeTakeFirst();

    if (!created) throw new NotFoundError('Account not found after creation');
    return c.json<AccountCreateOutput>(toAccountData(created), 201);
  })
  .post('/update', authMiddleware, zValidator('json', accountUpdateSchema), async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');

    await getAccountWithOwnershipCheck(input.id, userId);

    const now = new Date().toISOString();
    const updateValues: {
      updated_at: string;
      name?: string;
      account_type?: AccountType;
      balance?: number;
    } = { updated_at: now };

    if (input.name !== undefined) updateValues.name = input.name;
    if (input.type !== undefined) updateValues.account_type = normalizeAccountType(input.type);
    if (input.balance !== undefined) updateValues.balance = Number(input.balance);

    await db.updateTable('finance_accounts').set(updateValues).where('id', '=', input.id).execute();

    const updated = await db
      .selectFrom('finance_accounts')
      .selectAll()
      .where('id', '=', input.id)
      .executeTakeFirst();

    if (!updated) throw new NotFoundError('Account not found after update');
    return c.json<AccountUpdateOutput>(toAccountData(updated), 200);
  })
  .post('/delete', authMiddleware, zValidator('json', accountDeleteSchema), async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');
    const auth = c.get('auth');

    const hasStepUp =
      (await hasRecentStepUp(userId, STEP_UP_ACTIONS.FINANCE_ACCOUNT_DELETE).catch(() => false)) ||
      isFreshPasskeyAuth({
        amr: auth?.amr,
        authTime: auth?.authTime,
      });

    if (!hasStepUp) {
      return c.json(
        {
          error: 'step_up_required',
          action: STEP_UP_ACTIONS.FINANCE_ACCOUNT_DELETE,
        },
        403,
      );
    }

    await getAccountWithOwnershipCheck(input.id, userId);

    // Delete associated transactions first
    await db.deleteFrom('finance_transactions').where('account_id', '=', input.id).execute();

    // Delete the account
    await db.deleteFrom('finance_accounts').where('id', '=', input.id).execute();

    return c.json<AccountDeleteOutput>({ success: true }, 200);
  })
  .post('/with-plaid', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const userId = c.get('userId')!;
    const accounts = await db
      .selectFrom('finance_accounts')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();

    return c.json<AccountsWithPlaidOutput>(
      accounts.map((account) => ({
        ...toAccountWithPlaidInfo(account),
        plaidItemId: null,
      })),
      200,
    );
  })
  .post('/connections', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const userId = c.get('userId')!;

    // Get Plaid connections from PlaidItems table
    const connections = await db
      .selectFrom('plaid_items')
      .selectAll()
      .where('user_id', '=', userId)
      .execute();

    // Get accounts with institution info
    const institutions = await db
      .selectFrom('finance_accounts')
      .selectAll()
      .where('user_id', '=', userId)
      .execute();

    const institutionNames = new Map<string, string>();
    for (const account of institutions) {
      if (account.id && account.name) {
        institutionNames.set(account.id, account.name);
      }
    }

    const result: AccountConnectionsOutput = connections.map((connection): PlaidConnection => {
      const institutionId = connection.institution_id;
      return toPlaidConnection(
        connection,
        institutionId ? institutionNames.get(institutionId) : undefined,
      );
    });

    return c.json<AccountConnectionsOutput>(result, 200);
  })
  .post(
    '/institution-accounts',
    authMiddleware,
    zValidator('json', institutionAccountsSchema),
    async (c) => {
      const userId = c.get('userId')!;
      const input = c.req.valid('json');
      const accounts = await db
        .selectFrom('finance_accounts')
        .selectAll()
        .where((eb) =>
          eb.and([eb('user_id', '=', userId), eb('institution_id', '=', input.institutionId)]),
        )
        .execute();

      return c.json<AccountInstitutionAccountsOutput>(
        accounts.map((account) => ({
          ...toAccountWithPlaidInfo(account),
          plaidItemId: null,
        })),
        200,
      );
    },
  )
  .post('/all', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const userId = c.get('userId')!;

    const [accounts, connections] = await Promise.all([
      db
        .selectFrom('finance_accounts')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .execute(),
      db.selectFrom('plaid_items').selectAll().where('user_id', '=', userId).execute(),
    ]);

    const payload: AccountAllOutput = {
      accounts: accounts.map((account) => ({
        ...toAccountWithPlaidInfo(account),
        plaidItemId: null,
        transactions: [],
      })),
      connections: connections.map((connection) => toPlaidConnection(connection)),
    };
    return c.json<AccountAllOutput>(payload, 200);
  });
