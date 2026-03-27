import { db } from '@hominem/db';
import { sql } from 'kysely';

import type { FinanceCategory } from '../lib/types';
import { toNumber, tableExists } from '../lib/utils';

export async function getBudgetTrackingData(
  userId: string,
): Promise<{ totalBudget: number; totalSpent: number }> {
  const spentResult = await db
    .selectFrom('app.finance_transactions')
    .select(sql<number>`coalesce(sum(abs(amount)), 0)`.as('total_spent'))
    .where('owner_user_id', '=', userId)
    .where('transaction_type', '=', 'expense')
    .executeTakeFirst();
  const totalSpent = spentResult ? toNumber(spentResult.total_spent) : 0;

  const hasBudgetGoals = await tableExists('app.goals');
  if (!hasBudgetGoals) {
    return { totalBudget: 0, totalSpent };
  }

  const budgetResult = await db
    .selectFrom('app.goals')
    .select(sql<number>`coalesce(sum(target_amount), 0)`.as('total_budget'))
    .where('owner_user_id', '=', userId)
    .executeTakeFirst();
  return {
    totalBudget: budgetResult ? toNumber(budgetResult.total_budget) : 0,
    totalSpent,
  };
}

export async function getBudgetCategoriesWithSpending(
  userId: string,
): Promise<Array<FinanceCategory & { spent: number }>> {
  const result = await db
    .selectFrom('app.tags as tg')
    .leftJoin('app.tag_assignments as ti', (join) =>
      join.onRef('ti.tag_id', '=', 'tg.id').on('ti.entity_table', '=', 'finance_transaction'),
    )
    .leftJoin('app.finance_transactions as t', (join) =>
      join
        .onRef('t.id', '=', 'ti.entity_id')
        .onRef('t.owner_user_id', '=', 'tg.owner_user_id')
        .on('t.transaction_type', '=', 'expense'),
    )
    .select([
      'tg.id',
      'tg.owner_user_id',
      'tg.name',
      'tg.color',
      sql<number>`coalesce(sum(abs(t.amount)), 0)`.as('spent'),
    ])
    .where('tg.owner_user_id', '=', userId)
    .groupBy(['tg.id', 'tg.owner_user_id', 'tg.name', 'tg.color'])
    .orderBy('tg.name', 'asc')
    .orderBy('tg.id', 'asc')
    .execute();

  return result.map((row) => ({
    id: row.id,
    userId: row.owner_user_id,
    name: row.name,
    parentId: null,
    icon: null,
    color: row.color,
    spent: toNumber(row.spent),
  }));
}
