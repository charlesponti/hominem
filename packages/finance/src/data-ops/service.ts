import { db } from '@hominem/db';
import { sql } from 'kysely';

import { listAccounts } from '../accounts/service';
import { getTransactionTags } from '../categories/service';
import { FINANCE_TRANSACTION_ENTITY_TYPE } from '../contracts';
import type { FinanceAccount, FinanceCategory, FinanceTransaction, PlaidItem } from '../lib/types';
import { toIsoStringOrNull, tableExists } from '../lib/utils';

export async function deleteUserFinanceData(userId: string): Promise<{
  deletedTaggedItems: number;
  deletedTransactions: number;
  deletedAccounts: number;
  deletedBudgetGoals: number;
  deletedPlaidItems: number;
}> {
  const taggedItemsResult = await db
    .deleteFrom('app.tag_assignments')
    .where(
      sql<boolean>`entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE} and entity_id in (select id from app.finance_transactions where owner_user_id = ${userId})`,
    )
    .executeTakeFirst();
  const deletedTaggedItems = Number(taggedItemsResult?.numDeletedRows ?? 0n);

  const transactionsResult = await db
    .deleteFrom('app.finance_transactions')
    .where('owner_user_id', '=', userId)
    .executeTakeFirst();
  const deletedTransactions = Number(transactionsResult?.numDeletedRows ?? 0n);

  const accountsResult = await db
    .deleteFrom('app.finance_accounts')
    .where('owner_user_id', '=', userId)
    .executeTakeFirst();
  const deletedAccounts = Number(accountsResult?.numDeletedRows ?? 0n);

  let deletedBudgetGoals = 0;
  if (await tableExists('app.goals')) {
    const budgetGoalsResult = await db
      .deleteFrom('app.goals')
      .where('owner_user_id', '=', userId)
      .executeTakeFirst();
    deletedBudgetGoals = Number(budgetGoalsResult?.numDeletedRows ?? 0n);
  }

  let deletedPlaidItems = 0;
  if (await tableExists('app.plaid_items')) {
    const plaidItemsResult = await db
      .deleteFrom('app.plaid_items')
      .where('owner_user_id', '=', userId)
      .executeTakeFirst();
    deletedPlaidItems = Number(plaidItemsResult?.numDeletedRows ?? 0n);
  }

  return {
    deletedTaggedItems,
    deletedTransactions,
    deletedAccounts,
    deletedBudgetGoals,
    deletedPlaidItems,
  };
}

export async function deleteAllFinanceDataWithSummary(userId: string): Promise<{
  deletedTaggedItems: number;
  deletedTransactions: number;
  deletedAccounts: number;
  deletedBudgetGoals: number;
  deletedPlaidItems: number;
}> {
  return deleteUserFinanceData(userId);
}

export async function deleteAllFinanceData(userId: string): Promise<void> {
  await deleteUserFinanceData(userId);
}

export async function exportFinanceData(userId: string): Promise<{
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  tags: FinanceCategory[];
  budgetGoals: Array<{
    id: string;
    categoryId: string | null;
    targetAmount: number;
    targetPeriod: string;
  }>;
  plaidItems: PlaidItem[];
}> {
  const [accounts, transactions, tags] = await Promise.all([
    listAccounts(userId),
    queryTransactionsForExport(userId),
    getTransactionTags(userId),
  ]);

  let budgetGoals: Array<{
    id: string;
    categoryId: string | null;
    targetAmount: number;
    targetPeriod: string;
  }> = [];
  if (await tableExists('app.goals')) {
    const budgetGoalsResult = await db
      .selectFrom('app.goals')
      .selectAll()
      .where('owner_user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'asc')
      .execute();
    budgetGoals = budgetGoalsResult.map((row) => ({
      id: row.id,
      categoryId: null,
      targetAmount: 0,
      targetPeriod: 'monthly',
    }));
  }

  let plaidItems: PlaidItem[] = [];
  if (await tableExists('app.plaid_items')) {
    const plaidItemsResult = await db
      .selectFrom('app.plaid_items')
      .selectAll()
      .where('owner_user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'asc')
      .execute();
    plaidItems = plaidItemsResult.map((row) => ({
      id: row.id,
      userId: row.owner_user_id,
      itemId: row.provider_item_id,
      institutionId: row.institution_id,
      transactionsCursor: row.cursor,
      accessToken: row.access_token_encrypted,
      status: row.status,
      lastSyncedAt: toIsoStringOrNull(row.last_synced_at),
    }));
  }

  return {
    accounts,
    transactions,
    tags,
    budgetGoals,
    plaidItems,
  };
}

async function queryTransactionsForExport(userId: string): Promise<FinanceTransaction[]> {
  const { queryTransactionsByContract } = await import('../transactions/service');
  return queryTransactionsByContract({ userId, limit: 200, offset: 0 });
}
