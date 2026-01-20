import { db } from '@hominem/db';
import {
  type FinanceAccount,
  type FinanceAccountInsert,
  type FinanceTransaction,
  financeAccounts,
  financialInstitutions,
  plaidItems,
  transactions,
} from '@hominem/db/schema';
import { logger } from '@hominem/utils/logger';
import { and, eq, sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { z } from 'zod';

import { AccountTypeEnum } from '../finance.schemas';

// Account service schemas
export const createAccountInputSchema = z.object({
  name: z.string(),
  type: AccountTypeEnum,
  balance: z.string(),
  isoCurrencyCode: z.string().default('USD'),
  userId: z.string(),
  interestRate: z.string().optional().nullable(),
  minimumPayment: z.string().optional().nullable(),
  mask: z.string().optional().nullable(),
  subtype: z.string().optional().nullable(),
  officialName: z.string().optional().nullable(),
  limit: z.string().optional().nullable(),
  institutionId: z.string().optional().nullable(),
  plaidItemId: z.string().optional().nullable(),
  plaidAccountId: z.string().optional().nullable(),
});

export const createAccountOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  balance: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string(),
  interestRate: z.string().nullable(),
  minimumPayment: z.string().nullable(),
  mask: z.string().nullable(),
  isoCurrencyCode: z.string().nullable(),
  subtype: z.string().nullable(),
  officialName: z.string().nullable(),
  limit: z.string().nullable(),
  institutionId: z.string().nullable(),
  plaidItemId: z.string().nullable(),
  plaidAccountId: z.string().nullable(),
});

export async function createAccount(
  account: Omit<FinanceAccountInsert, 'id'>,
): Promise<FinanceAccount> {
  try {
    const [createdAccount] = await db
      .insert(financeAccounts)
      .values({
        id: crypto.randomUUID(),
        ...account,
      })
      .returning();

    if (!createdAccount) {
      throw new Error(`Failed to create account: ${account.name}`);
    }

    return createdAccount;
  } catch (error) {
    logger.error('[createAccount]:', {
      error,
      accountData: {
        name: account.name,
        type: account.type,
        balance: account.balance,
        userId: account.userId,
        institutionId: account.institutionId,
      },
    });
    throw error;
  }
}

export async function createManyAccounts(
  accounts: Array<Omit<FinanceAccountInsert, 'id'>>,
): Promise<FinanceAccount[]> {
  if (accounts.length === 0) {
    return [];
  }

  try {
    const accountsWithIds = accounts.map((acc) => ({
      id: crypto.randomUUID(),
      ...acc,
    }));

    const createdAccounts = await db.insert(financeAccounts).values(accountsWithIds).returning();
    return createdAccounts;
  } catch (error) {
    logger.error('[createManyAccounts]:', { error });
    throw error;
  }
}

export async function listAccounts(userId: string): Promise<FinanceAccount[]> {
  try {
    return await db.query.financeAccounts.findMany({
      where: eq(financeAccounts.userId, userId),
      orderBy: (accounts) => accounts.name,
    });
  } catch (error) {
    logger.error('[listAccounts]:', { error });
    throw error;
  }
}

export async function getAccountById(id: string, userId: string): Promise<FinanceAccount | null> {
  try {
    const account = await db.query.financeAccounts.findFirst({
      where: and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
    });
    return account ?? null;
  } catch (error) {
    logger.error('[getAccountById]:', { error });
    throw error;
  }
}

export async function updateAccount(
  id: string,
  userId: string,
  updates: Partial<Omit<FinanceAccountInsert, 'id'>>,
): Promise<FinanceAccount> {
  try {
    const [updated] = await db
      .update(financeAccounts)
      .set(updates)
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)))
      .returning();
    if (!updated) {
      throw new Error(`Account not found or not updated: ${id}`);
    }
    return updated;
  } catch (error) {
    logger.error('[updateAccount]:', { error });
    throw error;
  }
}

export async function deleteAccount(id: string, userId: string): Promise<void> {
  try {
    await db
      .delete(financeAccounts)
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)));
  } catch (error) {
    logger.error('[deleteAccount]:', { error });
    throw error;
  }
}

export async function findAccountByNameForUser(userId: string, name: string) {
  const existingAccount = await db.query.financeAccounts.findFirst({
    where: and(eq(financeAccounts.userId, userId), eq(financeAccounts.name, name)),
  });
  return existingAccount ?? null;
}

type AccountWithTransactions = FinanceAccount & {
  transactions: FinanceTransaction[];
};

type AccountWithPlaidInfo = FinanceAccount & {
  institutionName: string | null;
  institutionLogo: string | null;
  isPlaidConnected: boolean;
  plaidItemStatus: string | null;
  plaidItemError: unknown;
  plaidLastSyncedAt: Date | null;
  plaidItemInternalId: string | null;
  plaidInstitutionId: string | null;
  plaidInstitutionName: string | null;
};

export async function listAccountsWithRecentTransactions(
  userId: string,
  transactionLimit = 5,
): Promise<AccountWithTransactions[]> {
  try {
    const query = sql`
      WITH ranked_transactions AS (
        SELECT
          t.*,
          ROW_NUMBER() OVER (PARTITION BY t.account_id ORDER BY t.date DESC) as rn
        FROM ${transactions} t
        WHERE t.user_id = ${userId} AND t.excluded = false AND t.pending = false
      ),
      recent_transactions AS (
        SELECT
          rt.account_id,
          json_agg(json_build_object(
            'id', rt.id,
            'type', rt.type,
            'amount', rt.amount,
            'date', rt.date,
            'description', rt.description,
            'merchantName', rt.merchant_name,
            'accountId', rt.account_id,
            'fromAccountId', rt.from_account_id,
            'toAccountId', rt.to_account_id,
            'eventId', rt.event_id,
            'investmentDetails', rt.investment_details,
            'status', rt.status,
            'category', rt.category,
            'parentCategory', rt.parent_category,
            'excluded', rt.excluded,
            'tags', rt.tags,
            'accountMask', rt.account_mask,
            'note', rt.note,
            'recurring', rt.recurring,
            'plaidTransactionId', rt.plaid_transaction_id,
            'pending', rt.pending,
            'paymentChannel', rt.payment_channel,
            'location', rt.location,
            'source', rt.source,
            'createdAt', rt.created_at,
            'updatedAt', rt.updated_at,
            'userId', rt.user_id
          ) ORDER BY rt.date DESC) as transactions
        FROM ranked_transactions rt
        WHERE rt.rn <= ${transactionLimit}
        GROUP BY rt.account_id
      )
      SELECT
        fa.*,
        COALESCE(rt.transactions, '[]'::json) as transactions
      FROM ${financeAccounts} fa
      LEFT JOIN recent_transactions rt ON fa.id = rt.account_id
      WHERE fa.user_id = ${userId}
      ORDER BY fa.name;
    `;
    const result = (await db.execute(query)) as Array<AccountWithTransactions>;

    return result.map((account) => ({
      ...account,
      transactions: account.transactions || [],
    }));
  } catch (error) {
    logger.error('[listAccountsWithRecentTransactions]:', { error });
    throw error;
  }
}

export async function getAccountWithPlaidInfo(
  accountId: string,
  userId: string,
): Promise<AccountWithPlaidInfo | null> {
  const [account] = await db
    .select({
      id: financeAccounts.id,
      userId: financeAccounts.userId,
      name: financeAccounts.name,
      type: financeAccounts.type,
      balance: financeAccounts.balance,
      interestRate: financeAccounts.interestRate,
      minimumPayment: financeAccounts.minimumPayment,
      institutionId: financeAccounts.institutionId,
      plaidAccountId: financeAccounts.plaidAccountId,
      plaidItemId: financeAccounts.plaidItemId,
      mask: financeAccounts.mask,
      isoCurrencyCode: financeAccounts.isoCurrencyCode,
      subtype: financeAccounts.subtype,
      officialName: financeAccounts.officialName,
      limit: financeAccounts.limit,
      meta: financeAccounts.meta,
      lastUpdated: financeAccounts.lastUpdated,
      createdAt: financeAccounts.createdAt,
      updatedAt: financeAccounts.updatedAt,
      institutionName: financialInstitutions.name,
      institutionLogo: financialInstitutions.logo,
      isPlaidConnected: sql<boolean>` ${financeAccounts.plaidItemId} IS NOT NULL`,
      plaidItemStatus: plaidItems.status,
      plaidItemError: plaidItems.error,
      plaidLastSyncedAt: plaidItems.lastSyncedAt,
      plaidItemInternalId: plaidItems.id,
      plaidInstitutionId: plaidItems.institutionId,
      plaidInstitutionName: financialInstitutions.name,
    })
    .from(financeAccounts)
    .leftJoin(plaidItems, eq(financeAccounts.plaidItemId, plaidItems.id))
    .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
    .where(and(eq(financeAccounts.id, accountId), eq(financeAccounts.userId, userId)));

  return account ?? null;
}

export async function listAccountsWithPlaidInfo(userId: string): Promise<AccountWithPlaidInfo[]> {
  return db
    .select({
      id: financeAccounts.id,
      userId: financeAccounts.userId,
      name: financeAccounts.name,
      type: financeAccounts.type,
      balance: financeAccounts.balance,
      interestRate: financeAccounts.interestRate,
      minimumPayment: financeAccounts.minimumPayment,
      institutionId: financeAccounts.institutionId,
      plaidAccountId: financeAccounts.plaidAccountId,
      plaidItemId: financeAccounts.plaidItemId,
      mask: financeAccounts.mask,
      isoCurrencyCode: financeAccounts.isoCurrencyCode,
      subtype: financeAccounts.subtype,
      officialName: financeAccounts.officialName,
      limit: financeAccounts.limit,
      meta: financeAccounts.meta,
      lastUpdated: financeAccounts.lastUpdated,
      createdAt: financeAccounts.createdAt,
      updatedAt: financeAccounts.updatedAt,
      institutionName: financialInstitutions.name,
      institutionLogo: financialInstitutions.logo,
      isPlaidConnected: sql<boolean>` ${financeAccounts.plaidItemId} IS NOT NULL`,
      plaidItemStatus: plaidItems.status,
      plaidItemError: plaidItems.error,
      plaidLastSyncedAt: plaidItems.lastSyncedAt,
      plaidItemInternalId: plaidItems.id,
      plaidInstitutionId: plaidItems.institutionId,
      plaidInstitutionName: financialInstitutions.name,
    })
    .from(financeAccounts)
    .leftJoin(plaidItems, eq(financeAccounts.plaidItemId, plaidItems.id))
    .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
    .where(eq(financeAccounts.userId, userId));
}

export async function listPlaidConnectionsForUser(userId: string) {
  return db
    .select({
      id: plaidItems.id,
      itemId: plaidItems.itemId,
      institutionId: plaidItems.institutionId,
      institutionName: financialInstitutions.name,
      status: plaidItems.status,
      lastSyncedAt: plaidItems.lastSyncedAt,
      error: plaidItems.error,
      createdAt: plaidItems.createdAt,
    })
    .from(plaidItems)
    .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
    .where(eq(plaidItems.userId, userId));
}

export async function getAccountBalanceSummary(userId: string) {
  try {
    const accounts = await db
      .select({
        id: financeAccounts.id,
        name: financeAccounts.name,
        type: financeAccounts.type,
        balance: financeAccounts.balance,
      })
      .from(financeAccounts)
      .where(eq(financeAccounts.userId, userId));

    const totalBalance = accounts.reduce((sum, account) => {
      return sum + Number.parseFloat(account.balance || '0');
    }, 0);

    return {
      accounts,
      totalBalance: totalBalance.toFixed(2),
      accountCount: accounts.length,
    };
  } catch (error) {
    logger.error('[getAccountBalanceSummary]:', { error });
    throw error;
  }
}

export async function getAndCreateAccountsInBulk(
  accountNames: string[],
  userId: string,
): Promise<Map<string, FinanceAccount>> {
  const existingAccounts = await listAccounts(userId);
  const existingAccountsMap = new Map(existingAccounts.map((acc) => [acc.name, acc]));

  const newAccountNames = accountNames.filter((name) => !existingAccountsMap.has(name));

  if (newAccountNames.length > 0) {
    const newAccounts = await createManyAccounts(
      newAccountNames.map((name) => ({
        type: 'checking',
        balance: '0',
        name,
        institutionId: null,
        meta: null,
        userId,
      })),
    );
    for (const newAccount of newAccounts) {
      existingAccountsMap.set(newAccount.name, newAccount);
    }
  }

  return existingAccountsMap;
}
