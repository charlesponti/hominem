import { randomUUID } from 'node:crypto';

import { countOwnedAccounts, listImportAccountSnapshots } from '@hominem/finance-services';
import {
  applyAccountMappingsToPlan,
  createCopilotImportPlan,
  parseCopilotCsv,
  resolveCopilotAccounts,
  updatePlanSelection,
  type ImportPlan,
} from '@hominem/finance-services/import';
import {
  listCopilotExternalIds,
  listTransactionCompositeKeys,
} from '@hominem/finance-services/transactions';
import type { ImportTransactionsJob } from '@hominem/queues';
import { z } from 'zod';

import { getServerSession } from '~/lib/auth.server';

import type { ImportPreflightPreview } from './import-types';

/**
 * Server handlers for the Copilot import API, served same-origin by the
 * finance app's own route modules (see app/routes/api.finance.import.*).
 * The heavy @hominem/queues module is imported lazily so a deployment
 * without REDIS_URL configured still boots — only the import endpoints
 * themselves fail, and only when used.
 */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PREFLIGHT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const confirmationSchema = z.object({
  mappings: z.array(
    z.object({
      groupKey: z.string().min(1),
      accountId: z.string().uuid().optional(),
      createNew: z.boolean().optional(),
    }),
  ),
  selectedRowIds: z.array(z.string().min(1)),
});

function errorJson(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

/** Session user for the import API; API-style 401 instead of a login redirect. */
async function importUserId(
  request: Request,
): Promise<{ userId: string; headers: Headers } | Response> {
  const { user, headers } = await getServerSession(request);
  if (!user?.id) {
    return Response.json({ error: 'Authentication required' }, { status: 401, headers });
  }
  return { userId: user.id, headers };
}

export function methodNotAllowed(): Response {
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

/** Resolves the session user and re-attaches any refreshed session headers to the response. */
export async function withImportUser(
  request: Request,
  handler: (userId: string) => Promise<Response>,
): Promise<Response> {
  const result = await importUserId(request);
  if (result instanceof Response) return result;
  const response = await handler(result.userId);
  for (const [key, value] of result.headers) {
    response.headers.append(key, value);
  }
  return response;
}

function parseImportPlan(planContent: string): ImportPlan {
  return JSON.parse(planContent);
}

function previewPlan(plan: ImportPlan) {
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
      needsReview: transaction.needsReview,
      reviewReason: transaction.reviewReason,
      recurring: transaction.recurring,
      ledgerDuplicate: transaction.ledgerDuplicate,
      pending: transaction.pending,
      excluded: transaction.excluded,
    })),
  };
}

/** POST /api/finance/import/preflight — parse the upload and build a plan. */
export async function createImportPreflight(request: Request): Promise<Response> {
  return withImportUser(request, (userId) => createImportPreflightForUser(request, userId));
}

async function createImportPreflightForUser(request: Request, userId: string): Promise<Response> {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return errorJson('Copilot CSV exceeds the 10 MB upload limit');
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return errorJson('A Copilot CSV file is required');

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (fileBuffer.length === 0) return errorJson('Copilot CSV cannot be empty');
  if (fileBuffer.length > MAX_UPLOAD_BYTES) {
    return errorJson('Copilot CSV exceeds the 10 MB upload limit');
  }

  const parsed = parseCopilotCsv(fileBuffer);
  if (!('rows' in parsed)) return errorJson(parsed.message);
  if (parsed.rows.length === 0) return errorJson('Copilot CSV contains no valid rows');

  const [accounts, externalIds, compositeKeys] = await Promise.all([
    listImportAccountSnapshots(userId),
    listCopilotExternalIds(userId),
    listTransactionCompositeKeys(userId),
  ]);
  const resolution = resolveCopilotAccounts(parsed.rows, accounts);
  const plan = createCopilotImportPlan(parsed.rows, resolution, externalIds, {
    existingCompositeKeys: compositeKeys,
  });
  plan.invalidRows = parsed.invalidRows;
  plan.stats.invalid = parsed.invalidRows.length;
  plan.stats.total = parsed.rows.length + parsed.invalidRows.length;

  const { createPreflight } = await import('@hominem/queues');
  const preflightId = randomUUID();
  const planId = randomUUID();
  const preflight = {
    preflightId,
    userId,
    fileName: file.name,
    status: 'ready' as const,
    planId,
    createdAt: Date.now(),
    expiresAt: Date.now() + PREFLIGHT_TTL_MS,
  };
  await createPreflight(preflight, fileBuffer.toString('utf8'), JSON.stringify(plan));

  const preview: ImportPreflightPreview = {
    preflight,
    plan: previewPlan(plan),
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      mask: account.mask,
    })),
  };
  return Response.json(preview, { status: 201 });
}

/** GET /api/finance/import/preflight/:preflightId — resume a stored preflight. */
export async function getImportPreflight(userId: string, preflightId: string): Promise<Response> {
  const { getPreflight, getPreflightPlanContent } = await import('@hominem/queues');
  const [preflight, planContent, accounts] = await Promise.all([
    getPreflight(preflightId, userId),
    getPreflightPlanContent(preflightId, userId),
    listImportAccountSnapshots(userId),
  ]);
  if (!preflight || !planContent) {
    return errorJson('Preflight was not found or expired', 404);
  }
  return Response.json({
    preflight,
    plan: previewPlan(parseImportPlan(planContent)),
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      mask: account.mask,
    })),
  });
}

/** DELETE /api/finance/import/preflight/:preflightId. */
export async function deleteImportPreflight(
  userId: string,
  preflightId: string,
): Promise<Response> {
  const { deletePreflight } = await import('@hominem/queues');
  const deleted = await deletePreflight(preflightId, userId);
  if (!deleted) return errorJson('Preflight was not found or expired', 404);
  return Response.json({ success: true });
}

/** POST /api/finance/import/preflight/:preflightId/confirm — queue the import job. */
export async function confirmImportPreflight(
  userId: string,
  preflightId: string,
  request: Request,
): Promise<Response> {
  const {
    claimPreflight,
    createImportJob,
    deletePreflight,
    getPreflight,
    getPreflightPlanContent,
    importTransactionsQueue,
    setImportPlanContent,
    updatePreflightStatus,
  } = await import('@hominem/queues');

  const preflight = await getPreflight(preflightId, userId);
  const planContent = await getPreflightPlanContent(preflightId, userId);
  if (!preflight || !planContent || preflight.status !== 'ready') {
    return errorJson('Preflight was not found, expired, or already confirmed', 404);
  }

  const parsedBody = confirmationSchema.safeParse(await request.json());
  if (!parsedBody.success) return errorJson('Invalid Copilot import confirmation');
  const body = parsedBody.data;

  const plan = parseImportPlan(planContent);
  const planRowIds = new Set(plan.transactions.map((transaction) => transaction.rowId));
  if (body.selectedRowIds.some((rowId) => !planRowIds.has(rowId))) {
    return errorJson('Selected rows do not belong to this preflight');
  }
  const accountIds = body.mappings.flatMap((mapping) =>
    mapping.accountId ? [mapping.accountId] : [],
  );
  if (accountIds.length > 0) {
    const owned = await countOwnedAccounts(userId, accountIds);
    if (owned !== new Set(accountIds).size) {
      return errorJson('One or more selected accounts do not belong to the current user');
    }
  }

  const mappedPlan = applyAccountMappingsToPlan(plan, body.mappings);
  if (!(await claimPreflight(preflightId, userId))) {
    return errorJson('Preflight was already confirmed');
  }
  const selectedRowIds = new Set(body.selectedRowIds);
  const planToRun = updatePlanSelection(mappedPlan, selectedRowIds);
  await setImportPlanContent(preflight.planId, JSON.stringify(planToRun));

  const jobId = randomUUID();
  const job: ImportTransactionsJob = {
    jobId,
    userId,
    type: 'import-transactions',
    fileName: preflight.fileName,
    planId: preflight.planId,
    status: 'queued',
    stats: {
      total: planToRun.stats.total,
      created: 0,
      skipped: planToRun.stats.skipped,
      invalid: planToRun.stats.invalid,
    },
    startTime: Date.now(),
  };
  await createImportJob(job);
  await importTransactionsQueue.add(
    'import-transactions',
    {
      planId: preflight.planId,
      fileName: preflight.fileName,
      userId,
      status: 'queued',
      createdAt: Date.now(),
      type: 'import-transactions',
    },
    {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
  await updatePreflightStatus(preflightId, userId, 'confirmed');
  await deletePreflight(preflightId, userId);

  return Response.json({ success: true, jobId, fileName: preflight.fileName, status: 'queued' });
}

/** GET /api/finance/import/jobs — active import jobs for the session user. */
export async function listImportJobs(userId: string): Promise<Response> {
  const { getUserJobs } = await import('@hominem/queues');
  return Response.json(await getUserJobs<ImportTransactionsJob>(userId));
}

/** POST /api/finance/import/jobs/:jobId/cancel. */
export async function cancelImportJob(userId: string, jobId: string): Promise<Response> {
  const {
    getJobStatus,
    importTransactionsQueue,
    publishImportProgress,
    requestImportCancellation,
    updateImportJob,
  } = await import('@hominem/queues');

  const job = await getJobStatus<ImportTransactionsJob>(jobId);
  if (!job || job.userId !== userId) return errorJson('Import job was not found', 404);
  if (['done', 'error', 'cancelled'].includes(job.status)) return Response.json(job);

  const queueJob = await importTransactionsQueue.getJob(jobId);
  const state = queueJob ? await queueJob.getState() : null;
  if (queueJob && state && ['waiting', 'delayed', 'prioritized'].includes(state)) {
    await queueJob.remove();
    const cancelled = { ...job, status: 'cancelled' as const, endTime: Date.now() };
    await updateImportJob(jobId, cancelled);
    await publishImportProgress([cancelled]);
    return Response.json(cancelled);
  }

  const requested = await requestImportCancellation(jobId, userId);
  if (!requested) return errorJson('Import job cannot be cancelled');
  return Response.json({ ...job, status: 'processing' as const });
}
