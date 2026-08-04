import { db } from '@hominem/db';
import { COPILOT_PROVIDER, type ImportPlan } from '@hominem/finance-services/import';
import * as z from 'zod';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const PREFLIGHT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const confirmationSchema = z.object({
  mappings: z.array(
    z.object({
      groupKey: z.string().min(1),
      accountId: z.string().uuid().optional(),
      createNew: z.boolean().optional(),
    }),
  ),
  selectedRowIds: z.array(z.string().min(1)),
});

export function previewPlan(plan: ImportPlan) {
  return {
    source: plan.source,
    accountGroups: plan.accountGroups,
    unresolvedGroups: plan.unresolvedGroups,
    duplicateCandidateRowIds: plan.duplicateCandidateRowIds,
    invalidRows: plan.invalidRows,
    stats: plan.stats,
    transactions: plan.transactions.map((transaction) => ({
      rowId: transaction.rowId,
      line: transaction.line,
      groupKey: transaction.groupKey,
      accountId: transaction.accountId,
      accountTempKey: transaction.accountTempKey,
      selected: transaction.selected,
      amount: transaction.amount,
      postedOn: transaction.postedOn,
      description: transaction.description,
      transactionType: transaction.transactionType,
      pending: transaction.pending,
      excluded: transaction.excluded,
    })),
  };
}

export async function getExistingExternalIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .selectFrom('app.financeTransactions')
    .select('externalId')
    .where('userId', '=', userId)
    .where('source', '=', COPILOT_PROVIDER)
    .where('externalId', 'is not', null)
    .execute();
  return new Set(rows.flatMap((row) => (row.externalId ? [row.externalId] : [])));
}
