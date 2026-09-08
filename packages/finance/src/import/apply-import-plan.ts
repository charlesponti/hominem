import crypto from 'node:crypto';

import { runInTransaction } from '@hominem/db/transaction';
import type { TransactionHandle } from '@hominem/db/transaction';
import type { JsonObject } from '@hominem/db/types';

import { FINANCE_TRANSACTION_ENTITY_TYPE } from '../contracts';
import { ledgerCompositeKey } from './copilot-sign';
import { COPILOT_PROVIDER, type ImportPlan, type PlannedTransaction } from './types';

function tagSlug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, '-')
      .replace(/^-|-$/gu, '') || 'tag'
  );
}

async function findOrCreateTag(
  trx: TransactionHandle,
  userId: string,
  name: string,
  parentName: string | null,
): Promise<string> {
  const slug = tagSlug(name);
  const parentSlug = parentName ? tagSlug(parentName) : null;
  const path = parentSlug ? `${parentSlug}.${slug}` : slug;
  const existing = await trx
    .selectFrom('app.tags')
    .select('id')
    .where('ownerUserid', '=', userId)
    .where('name', '=', name)
    .where('path', '=', path)
    .executeTakeFirst();
  if (existing) return existing.id;

  try {
    const inserted = await trx
      .insertInto('app.tags')
      .values({
        id: crypto.randomUUID(),
        ownerUserid: userId,
        name,
        slug,
        path,
        color: null,
        archivedAt: null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return inserted.id;
  } catch (error) {
    const concurrent = await trx
      .selectFrom('app.tags')
      .select('id')
      .where('ownerUserid', '=', userId)
      .where('name', '=', name)
      .where('path', '=', path)
      .executeTakeFirst();
    if (concurrent) return concurrent.id;
    throw error;
  }
}

export interface ApplyImportBatchInput {
  userId: string;
  plan: ImportPlan;
  transactions: PlannedTransaction[];
}

export interface ApplyImportBatchResult {
  created: number;
  skipped: number;
  accountIds: Record<string, string>;
}

async function findOrCreateAccount(
  trx: TransactionHandle,
  userId: string,
  draft: ImportPlan['accountsToCreate'][number],
): Promise<string> {
  const existing = await trx
    .selectFrom('app.financeAccounts')
    .select('id')
    .where('userId', '=', userId)
    .where('csvImportKey', '=', draft.importKey)
    .executeTakeFirst();
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  try {
    const inserted = await trx
      .insertInto('app.financeAccounts')
      .values({
        id,
        userId,
        name: draft.name,
        mask: draft.mask,
        provider: COPILOT_PROVIDER,
        csvImportKey: draft.importKey,
        accountType: draft.accountType,
        metadata: {},
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return inserted.id;
  } catch (error) {
    const concurrent = await trx
      .selectFrom('app.financeAccounts')
      .select('id')
      .where('userId', '=', userId)
      .where('csvImportKey', '=', draft.importKey)
      .executeTakeFirst();
    if (concurrent) return concurrent.id;
    throw error;
  }
}

async function assertAccountOwnership(
  trx: TransactionHandle,
  userId: string,
  accountIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(accountIds)];
  if (uniqueIds.length === 0) return;
  const owned = await trx
    .selectFrom('app.financeAccounts')
    .select('id')
    .where('userId', '=', userId)
    .where('id', 'in', uniqueIds)
    .execute();
  if (owned.length !== uniqueIds.length) {
    throw new Error('Import plan contains an account outside the current user');
  }
}

export async function applyCopilotImportBatch(
  input: ApplyImportBatchInput,
): Promise<ApplyImportBatchResult> {
  return runInTransaction(async (trx) => {
    const accountIds: Record<string, string> = {};
    const accountIdsByTempKey: Record<string, string> = {};
    const tempKeyForImportKey = (importKey: string) =>
      `new:${crypto.createHash('sha256').update(importKey).digest('hex').slice(0, 24)}`;

    for (const draft of input.plan.accountsToCreate) {
      const accountId = await findOrCreateAccount(trx, input.userId, draft);
      accountIds[draft.importKey] = accountId;
      accountIdsByTempKey[tempKeyForImportKey(draft.importKey)] = accountId;
    }

    const explicitAccountIds = input.transactions.flatMap((transaction) =>
      transaction.accountId ? [transaction.accountId] : [],
    );
    await assertAccountOwnership(trx, input.userId, explicitAccountIds);

    const resolved = input.transactions.map((transaction) => {
      const accountId =
        transaction.accountId ??
        (transaction.accountTempKey ? accountIdsByTempKey[transaction.accountTempKey] : undefined);
      if (!accountId) throw new Error(`No account resolved for row ${transaction.rowId}`);
      return { transaction, accountId };
    });

    if (resolved.length === 0) {
      return { created: 0, skipped: 0, accountIds };
    }

    // A row flagged as a ledger duplicate is refused only if the ledger holds
    // its composite key from outside this import; a cleared flag (explicit
    // user override, or updatePlanSelection on confirm) always proceeds.
    const batchAccountIds = [...new Set(resolved.map((row) => row.accountId))];
    const planExternalIds = new Set(
      input.plan.transactions.filter((row) => row.selected).map((row) => row.externalId),
    );
    const ledgerRows = await trx
      .selectFrom('app.financeTransactions')
      .select(['accountId', 'postedOn', 'amount', 'description', 'externalId'])
      .where('userId', '=', input.userId)
      .where('accountId', 'in', batchAccountIds)
      .execute();
    const ledgerExternalIds = new Map<string, Set<string | null>>();
    for (const row of ledgerRows) {
      const key = ledgerCompositeKey(row.accountId, row.postedOn, row.amount, row.description);
      const bucket = ledgerExternalIds.get(key) ?? new Set<string | null>();
      bucket.add(row.externalId);
      ledgerExternalIds.set(key, bucket);
    }
    const freshPairs = resolved.filter(({ transaction, accountId }) => {
      if (!transaction.ledgerDuplicate) return true;
      const bucket = ledgerExternalIds.get(
        ledgerCompositeKey(
          accountId,
          transaction.postedOn,
          transaction.amount,
          transaction.description,
        ),
      );
      if (!bucket) return true;
      return ![...bucket].some(
        (externalId) => externalId === null || !planExternalIds.has(externalId),
      );
    });
    if (freshPairs.length === 0) {
      return { created: 0, skipped: resolved.length, accountIds };
    }

    const rows = freshPairs.map(({ transaction, accountId }) => ({
      id: crypto.randomUUID(),
      userId: input.userId,
      accountId,
      amount: transaction.amount,
      description: transaction.description,
      merchantName: transaction.merchantName,
      postedOn: transaction.postedOn,
      pending: transaction.pending,
      source: COPILOT_PROVIDER,
      externalId: transaction.externalId,
      transactionType: transaction.transactionType,
      notes: transaction.notes,
      excluded: transaction.excluded,
      recurring: transaction.recurring,
      providerPayload: transaction.providerPayload as JsonObject,
    }));

    const inserted = await trx
      .insertInto('app.financeTransactions')
      .values(rows)
      .onConflict((conflict) =>
        conflict
          .columns(['userId', 'source', 'externalId'])
          .where('source', 'is not', null)
          .where('externalId', 'is not', null)
          .doNothing(),
      )
      .returning(['id', 'externalId'])
      .execute();

    const insertedByExternalId = new Map(inserted.map((row) => [row.externalId, row.id]));
    for (const transaction of input.transactions) {
      const transactionId = insertedByExternalId.get(transaction.externalId);
      if (!transactionId) continue;
      const tagInputs = [
        ...(transaction.parentCategory
          ? [{ name: transaction.parentCategory, parentName: null }]
          : []),
        ...(transaction.category
          ? [{ name: transaction.category, parentName: transaction.parentCategory }]
          : []),
        ...transaction.tags.map((tag) => ({ name: tag, parentName: null })),
      ];
      for (const tagInput of tagInputs) {
        const tagId = await findOrCreateTag(trx, input.userId, tagInput.name, tagInput.parentName);
        await trx
          .insertInto('app.tagAssignments')
          .values({
            id: crypto.randomUUID(),
            tagId,
            entityTable: FINANCE_TRANSACTION_ENTITY_TYPE,
            entityId: transactionId,
            assignmentSource: 'import',
            removedAt: null,
          })
          .onConflict((conflict) =>
            conflict
              .columns(['tagId', 'entityTable', 'entityId'])
              .where('removedAt', 'is', null)
              .doNothing(),
          )
          .execute();
      }
    }

    return {
      created: inserted.length,
      skipped: resolved.length - inserted.length,
      accountIds,
    };
  });
}
