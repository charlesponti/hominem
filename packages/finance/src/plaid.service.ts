import type {
  PlaidItemOutput,
  PlaidItemInput,
  FinancialInstitutionOutput,
  FinanceAccountInput,
  FinanceTransactionOutput,
  AccountType,
  TransactionType,
} from '@hominem/db/types/finance';

/**
 * Type for transaction location data (latitude/longitude)
 */
type TransactionLocation = {
  lat: number;
  lon: number;
} | null;

import { db } from '@hominem/db';
import {
  financialInstitutions,
  plaidItems,
  financeAccounts,
  transactions,
} from '@hominem/db/schema/finance';
import { logger } from '@hominem/utils/logger';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

/**
 * Unified Plaid Service
 * Handles all Plaid-related database operations including items, accounts, and transactions
 */

// ============================================================================
// Plaid Item Operations
// ============================================================================

export async function getPlaidItem(
  userId: string,
  itemId: string,
): Promise<PlaidItemOutput | null> {
  return (
    (await db.query.plaidItems.findFirst({
      where: and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId)),
    })) ?? null
  );
}

export async function getPlaidItemByUserAndItemId(
  userId: string,
  itemId: string,
): Promise<PlaidItemOutput | null> {
  return getPlaidItem(userId, itemId);
}

export async function getPlaidItemById(
  id: string,
  userId: string,
): Promise<PlaidItemOutput | null> {
  return (
    (await db.query.plaidItems.findFirst({
      where: and(eq(plaidItems.id, id), eq(plaidItems.userId, userId)),
    })) ?? null
  );
}

export async function getPlaidItemByItemId(itemId: string): Promise<PlaidItemOutput | null> {
  return (
    (await db.query.plaidItems.findFirst({
      where: eq(plaidItems.itemId, itemId),
    })) ?? null
  );
}

export async function upsertPlaidItem(params: {
  userId: string;
  itemId: string;
  accessToken: string;
  institutionId: string;
  status?: PlaidItemOutput['status'];
  lastSyncedAt?: Date | null;
}): Promise<PlaidItemOutput> {
  const {
    userId,
    itemId,
    accessToken,
    institutionId,
    status = 'active',
    lastSyncedAt = null,
  } = params;

  const existingItem = await getPlaidItemByUserAndItemId(userId, itemId);

  if (existingItem) {
    const [updated] = await db
      .update(plaidItems)
      .set({
        accessToken,
        status,
        error: null,
        lastSyncedAt,
        updatedAt: new Date(),
      })
      .where(eq(plaidItems.id, existingItem.id))
      .returning();

    return updated!;
  }

  const [created] = await db
    .insert(plaidItems)
    .values({
      id: randomUUID(),
      itemId,
      accessToken,
      institutionId,
      status,
      lastSyncedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
    })
    .returning();

  return created!;
}

export async function updatePlaidItemStatusByItemId(
  itemId: string,
  updates: Partial<Pick<PlaidItemInput, 'status' | 'error' | 'updatedAt' | 'lastSyncedAt'>>,
) {
  await db
    .update(plaidItems)
    .set({
      ...updates,
      updatedAt: updates.updatedAt ?? new Date(),
    })
    .where(eq(plaidItems.itemId, itemId));
}

export async function updatePlaidItemStatusById(
  id: string,
  updates: Partial<Pick<PlaidItemInput, 'status' | 'error' | 'updatedAt' | 'lastSyncedAt'>>,
) {
  await db
    .update(plaidItems)
    .set({
      ...updates,
      updatedAt: updates.updatedAt ?? new Date(),
    })
    .where(eq(plaidItems.id, id));
}

export async function updatePlaidItemCursor(itemId: string, cursor: string) {
  await db
    .update(plaidItems)
    .set({
      transactionsCursor: cursor,
    })
    .where(eq(plaidItems.id, itemId));
}

export async function updatePlaidItemSyncStatus(
  itemId: string,
  status: PlaidItemOutput['status'],
  error?: string | null,
) {
  await db
    .update(plaidItems)
    .set({
      lastSyncedAt: new Date(),
      status,
      error,
      updatedAt: new Date(),
    })
    .where(eq(plaidItems.id, itemId));
}

export async function updatePlaidItemError(itemId: string, error: string) {
  await db
    .update(plaidItems)
    .set({
      status: 'error',
      error,
      updatedAt: new Date(),
    })
    .where(eq(plaidItems.itemId, itemId));
}

export async function deletePlaidItem(id: string, userId: string) {
  await db.delete(plaidItems).where(and(eq(plaidItems.id, id), eq(plaidItems.userId, userId)));
}

// ============================================================================
// Financial Institution Operations
// ============================================================================

export async function ensureInstitutionExists(
  id: string,
  name: string,
): Promise<FinancialInstitutionOutput> {
  const existing = await db.query.financialInstitutions.findFirst({
    where: eq(financialInstitutions.id, id),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(financialInstitutions)
    .values({
      id,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created!;
}

// ============================================================================
// Finance Account Operations
// ============================================================================

export async function upsertAccount(accountData: {
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  balance: number;
  availableBalance: number | null;
  limit: number | null;
  isoCurrencyCode: string;
  plaidAccountId: string;
  plaidItemId: string;
  institutionId: string;
  userId: string;
}): Promise<string> {
  // Check if account already exists
  const existingAccount = await db.query.financeAccounts.findFirst({
    where: eq(financeAccounts.plaidAccountId, accountData.plaidAccountId),
  });

  if (existingAccount) {
    // Update existing account
    await db
      .update(financeAccounts)
      .set({
        balance: accountData.balance.toFixed(2),
        lastUpdated: new Date(),
      })
      .where(eq(financeAccounts.id, existingAccount.id));

    logger.info('Updated existing account', {
      accountId: existingAccount.id,
      plaidAccountId: accountData.plaidAccountId,
    });

    return existingAccount.id;
  }

  // Insert new account
  const newAccountId = randomUUID();
  await db.insert(financeAccounts).values({
    id: newAccountId,
    ...accountData,
    type: accountData.type as AccountType,
    balance: accountData.balance.toFixed(2),
    limit: accountData.limit?.toExponential(2),
    interestRate: null,
    minimumPayment: null,
    meta: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  logger.info('Created new account', {
    plaidAccountId: accountData.plaidAccountId,
  });

  return newAccountId;
}

export async function getUserAccounts(
  userId: string,
  plaidItemId: string,
): Promise<FinanceAccountInput[]> {
  return await db.query.financeAccounts.findMany({
    where: and(eq(financeAccounts.userId, userId), eq(financeAccounts.plaidItemId, plaidItemId)),
  });
}

export async function getAccountByPlaidId(plaidAccountId: string) {
  return await db.query.financeAccounts.findFirst({
    where: eq(financeAccounts.plaidAccountId, plaidAccountId),
  });
}

// ============================================================================
// Transaction Operations
// ============================================================================

export async function insertTransaction(transactionData: {
  type: TransactionType;
  amount: string;
  date: Date;
  description: string;
  merchantName: string | null;
  accountId: string;
  category: string | null;
  parentCategory: string | null;
  pending: boolean;
  paymentChannel: string;
  location: TransactionLocation | null;
  plaidTransactionId: string;
  userId: string;
}): Promise<string> {
  const transactionId = randomUUID();
  await db.insert(transactions).values({
    id: transactionId,
    ...transactionData,
    source: 'plaid',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return transactionId;
}

export async function getTransactionByPlaidId(
  plaidTransactionId: string,
): Promise<FinanceTransactionOutput | null> {
  return (
    (await db.query.transactions.findFirst({
      where: eq(transactions.plaidTransactionId, plaidTransactionId),
    })) ?? null
  );
}

export async function updateTransaction(
  transactionId: string,
  updateData: {
    type: TransactionType;
    amount: string;
    date: Date;
    description: string;
    merchantName: string | null;
    category: string | null;
    parentCategory: string | null;
    pending: boolean;
  },
) {
  await db
    .update(transactions)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, transactionId));
}

export async function deleteTransaction(plaidTransactionId: string): Promise<boolean> {
  const existingTransaction = await getTransactionByPlaidId(plaidTransactionId);
  if (existingTransaction) {
    await db.delete(transactions).where(eq(transactions.id, existingTransaction.id));
    return true;
  }
  return false;
}
