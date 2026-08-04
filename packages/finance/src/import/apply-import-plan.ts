import crypto from 'node:crypto';

import { runInTransaction, type JsonObject, type TransactionHandle } from '@hominem/db';

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
        createdByUserid: userId,
        name,
        slug,
        path,
        color: null,
        description: null,
        icon: null,
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
        currentBalance: 0,
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
    for (const draft of input.plan.accountsToCreate) {
      accountIds[draft.importKey] = await findOrCreateAccount(trx, input.userId, draft);
    }

    const explicitAccountIds = input.transactions.flatMap((transaction) =>
      transaction.accountId ? [transaction.accountId] : [],
    );
    await assertAccountOwnership(trx, input.userId, explicitAccountIds);

    const rows = input.transactions.map((transaction) => {
      const accountId =
        transaction.accountId ??
        (transaction.accountTempKey
          ? accountIds[
              input.plan.accountsToCreate.find(
                (draft) => `new:${draft.importKey}` === transaction.accountTempKey,
              )?.importKey ?? ''
            ]
          : undefined);
      if (!accountId) throw new Error(`No account resolved for row ${transaction.rowId}`);

      return {
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
        providerPayload: transaction.providerPayload as JsonObject,
      };
    });

    if (rows.length === 0) {
      return { created: 0, skipped: 0, accountIds };
    }

    const inserted = await trx
      .insertInto('app.financeTransactions')
      .values(rows)
      .onConflict((conflict) => conflict.columns(['userId', 'source', 'externalId']).doNothing())
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
            entityTable: 'app.financeTransactions',
            entityId: transactionId,
            assignedByUserid: input.userId,
            assignmentSource: 'copilot-money-import',
            confidence: null,
            removedAt: null,
          })
          .onConflict((conflict) =>
            conflict.columns(['tagId', 'entityTable', 'entityId']).doNothing(),
          )
          .execute();
      }
    }

    return {
      created: inserted.length,
      skipped: rows.length - inserted.length,
      accountIds,
    };
  });
}
