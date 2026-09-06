import { randomUUID } from 'crypto';

import { db } from '@hominem/db/core';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { NotFoundError } from '../errors';
import type { AppContext } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';

const accountListSchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
});

const accountGetSchema = z.object({
  id: z.string().uuid(),
});

const accountCreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1).optional(),
  institutionId: z.string().optional(),
});

const accountUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  institutionId: z.string().optional(),
});

const accountDeleteSchema = z.object({
  id: z.string().uuid(),
});

const institutionAccountsSchema = z.object({
  institutionId: z.string(),
});

async function getAccountBalances(accountIds: string[]): Promise<Map<string, number>> {
  if (accountIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .selectFrom('app.financeTransactions')
    .select((eb) => ['accountId', eb.fn.sum<number>('amount').as('balance')])
    .where('accountId', 'in', accountIds)
    .where('pending', '=', false)
    .groupBy('accountId')
    .execute();

  return new Map(rows.map((row) => [row.accountId, Number(row.balance ?? 0)]));
}

async function getAccountBalance(accountId: string): Promise<number> {
  const balances = await getAccountBalances([accountId]);
  return balances.get(accountId) ?? 0;
}

async function getAccountWithOwnershipCheck(accountId: string, userId: string) {
  const account = await db
    .selectFrom('app.financeAccounts')
    .selectAll()
    .where((eb) => eb.and([eb('id', '=', accountId), eb('userId', '=', userId)]))
    .executeTakeFirst();

  if (!account) {
    throw new NotFoundError('Account not found');
  }
  return account;
}

async function getTransactionsForAccount(
  accountId: string,
  limit: number = 200,
  offset: number = 0,
) {
  return db
    .selectFrom('app.financeTransactions')
    .selectAll()
    .where('accountId', '=', accountId)
    .orderBy('postedOn', 'desc')
    .limit(limit)
    .offset(offset)
    .execute();
}

type TransactionRow = Awaited<ReturnType<typeof getTransactionsForAccount>>[number];

function normalizeAccountRow(
  account: {
    id: string;
    userId: string;
    name: string;
    accountType: string;
    plaidAccountId?: string | null;
    plaidItemId?: string | null;
    institutionName?: string | null;
  },
  currentBalance: number,
) {
  return {
    id: String(account.id),
    userId: account.userId,
    name: account.name,
    accountType: account.accountType,
    currentBalance,
    institutionName: account.institutionName ?? null,
    plaidAccountId: account.plaidAccountId ? String(account.plaidAccountId) : null,
    plaidItemId: account.plaidItemId ? String(account.plaidItemId) : null,
  };
}

function normalizeTransactionRow(transaction: TransactionRow) {
  return {
    id: String(transaction.id),
    userId: transaction.userId,
    accountId: String(transaction.accountId),
    amount: transaction.amount ? Number(transaction.amount) : 0,
    description: transaction.description ?? null,
    postedOn: String(transaction.postedOn),
    merchantName: transaction.merchantName ?? null,
  };
}

function normalizePlaidConnection(
  connection: {
    id: string;
    institutionId: string | null;
    status: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    lastSyncedAt: string | Date | null;
  },
  institution: { name: string; logoUrl: string | null } | undefined,
  accounts: number,
): {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionLogo: string | null;
  status: 'active' | 'error' | 'disconnected';
  lastSynced: string;
  accounts: number;
} {
  return {
    id: String(connection.id),
    institutionId: connection.institutionId ?? '',
    institutionName: institution?.name ?? 'Connected institution',
    institutionLogo: institution?.logoUrl ?? null,
    status:
      connection.status === 'error'
        ? 'error'
        : connection.status === 'disconnected'
          ? 'disconnected'
          : 'active',
    lastSynced: String(connection.lastSyncedAt ?? connection.updatedAt ?? connection.createdAt),
    accounts,
  };
}

export const accountsRoutes = new Hono<AppContext>()
  .get('/list', authMiddleware, zValidator('query', accountListSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const accounts = await db
      .selectFrom('app.financeAccounts')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .execute();

    const balances = await getAccountBalances(accounts.map((account) => account.id));

    return c.json(
      accounts.map((account) => ({
        id: String(account.id),
        userId: account.userId,
        name: account.name,
        accountType: account.accountType,
        currentBalance: balances.get(account.id) ?? 0,
      })),
      200,
    );
  })
  .get('/get', authMiddleware, zValidator('query', accountGetSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('query');
    const account = await getAccountWithOwnershipCheck(input.id, userId);
    const [transactions, balance] = await Promise.all([
      getTransactionsForAccount(input.id, 200, 0),
      getAccountBalance(input.id),
    ]);

    return c.json({
      ...normalizeAccountRow(account, balance),
      transactions: transactions.map(normalizeTransactionRow),
    });
  })
  .post('/create', authMiddleware, zValidator('json', accountCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('json');
    const accountId = randomUUID();
    const now = new Date().toISOString();

    await db
      .insertInto('app.financeAccounts')
      .values({
        id: accountId,
        userId,
        name: input.name,
        accountType: input.type ?? 'other',
        createdAt: now,
        updatedAt: now,
      })
      .execute();

    const created = await db
      .selectFrom('app.financeAccounts')
      .selectAll()
      .where('id', '=', accountId)
      .executeTakeFirst();

    if (!created) throw new NotFoundError('Account not found after creation');

    return c.json(
      {
        id: String(created.id),
        userId: created.userId,
        name: created.name,
        accountType: created.accountType,
        currentBalance: 0,
      },
      201,
    );
  })
  .post('/update', authMiddleware, zValidator('json', accountUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('json');

    await getAccountWithOwnershipCheck(input.id, userId);

    const now = new Date().toISOString();
    const updateValues: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) updateValues.name = input.name;
    if (input.type !== undefined) updateValues.accountType = input.type;

    await db
      .updateTable('app.financeAccounts')
      .set(updateValues)
      .where('id', '=', input.id)
      .execute();

    const [updated, balance] = await Promise.all([
      db
        .selectFrom('app.financeAccounts')
        .selectAll()
        .where('id', '=', input.id)
        .executeTakeFirst(),
      getAccountBalance(input.id),
    ]);

    if (!updated) throw new NotFoundError('Account not found after update');

    return c.json(
      {
        id: String(updated.id),
        userId: updated.userId,
        name: updated.name,
        accountType: updated.accountType,
        currentBalance: balance,
      },
      200,
    );
  })
  .post('/delete', authMiddleware, zValidator('json', accountDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('json');

    await getAccountWithOwnershipCheck(input.id, userId);

    await db.deleteFrom('app.financeTransactions').where('accountId', '=', input.id).execute();
    await db.deleteFrom('app.financeAccounts').where('id', '=', input.id).execute();

    return c.json({ success: true }, 200);
  })
  .get('/with-plaid', authMiddleware, async (c) => {
    const userId = c.get('auth')!.userId;
    const accounts = await db
      .selectFrom('app.financeAccounts')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .execute();

    const balances = await getAccountBalances(accounts.map((account) => account.id));

    return c.json(
      accounts.map((account) => ({
        ...normalizeAccountRow(account, balances.get(account.id) ?? 0),
        institutionName: null,
      })),
      200,
    );
  })
  .get('/connections', authMiddleware, async (c) => {
    const userId = c.get('auth')!.userId;

    const connections = await db
      .selectFrom('app.plaidItems')
      .selectAll()
      .where('userId', '=', userId)
      .execute();

    return c.json(connections, 200);
  })
  .get(
    '/institution-accounts',
    authMiddleware,
    zValidator('query', institutionAccountsSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const input = c.req.valid('query');
      const accounts = await db
        .selectFrom('app.financeAccounts')
        .selectAll()
        .where((eb) =>
          eb.and([eb('userId', '=', userId), eb('institutionId', '=', input.institutionId)]),
        )
        .execute();

      const balances = await getAccountBalances(accounts.map((account) => account.id));

      return c.json(
        accounts.map((account) => ({
          ...normalizeAccountRow(account, balances.get(account.id) ?? 0),
          institutionName: null,
        })),
        200,
      );
    },
  )
  .get('/all', authMiddleware, async (c) => {
    const userId = c.get('auth')!.userId;

    const [accounts, connections, institutions] = await Promise.all([
      db
        .selectFrom('app.financeAccounts')
        .selectAll()
        .where('userId', '=', userId)
        .orderBy('createdAt', 'desc')
        .execute(),
      db.selectFrom('app.plaidItems').selectAll().where('userId', '=', userId).execute(),
      db.selectFrom('app.financeInstitutions').select(['id', 'name', 'logoUrl']).execute(),
    ]);

    const accountsByPlaidItem = new Map<string, number>();
    for (const account of accounts) {
      if (account.plaidItemId) {
        const key = String(account.plaidItemId);
        accountsByPlaidItem.set(key, (accountsByPlaidItem.get(key) ?? 0) + 1);
      }
    }

    const institutionMap = new Map(
      institutions.map((institution) => [institution.id, institution]),
    );
    const balances = await getAccountBalances(accounts.map((account) => account.id));

    return c.json(
      {
        accounts: accounts.map((account) => ({
          ...normalizeAccountRow(account, balances.get(account.id) ?? 0),
          transactions: [],
        })),
        connections: connections.map((connection) =>
          normalizePlaidConnection(
            connection,
            connection.institutionId ? institutionMap.get(connection.institutionId) : undefined,
            accountsByPlaidItem.get(String(connection.id)) ?? 0,
          ),
        ),
      },
      200,
    );
  });
