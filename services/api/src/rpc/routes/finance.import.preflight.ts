import { randomUUID } from 'node:crypto';

import { db } from '@hominem/db';
import {
  applyAccountMappingsToPlan,
  createCopilotImportPlan,
  parseCopilotCsv,
  resolveCopilotAccounts,
  updatePlanSelection,
  type AccountMapping,
  type ImportPlan,
} from '@hominem/finance-services/import';
import {
  claimPreflight,
  createImportJob,
  createPreflight,
  deletePreflight,
  getPreflight,
  getPreflightPlanContent,
  importTransactionsQueue,
  setImportPlanContent,
  updatePreflightStatus,
  type ImportPreflight,
  type ImportTransactionsJob,
} from '@hominem/queues';
import { Hono } from 'hono';

import { UnauthorizedError, ValidationError } from '../errors';
import type { AppContext } from '../middleware/auth';
import {
  confirmationSchema,
  getExistingExternalIds,
  MAX_UPLOAD_BYTES,
  PREFLIGHT_TTL_MS,
  previewPlan,
} from './finance.import.shared';

export const importPreflightRoutes = new Hono<AppContext>()
  .post('/preflight', async (c) => {
    const userId = c.get('auth')?.userId;
    if (!userId) throw new UnauthorizedError('Authentication required');

    const contentLength = Number(c.req.header('content-length') ?? 0);
    if (contentLength > MAX_UPLOAD_BYTES) {
      throw new ValidationError('Copilot CSV exceeds the 10 MB upload limit');
    }

    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) throw new ValidationError('A Copilot CSV file is required');

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (fileBuffer.length === 0) throw new ValidationError('Copilot CSV cannot be empty');
    if (fileBuffer.length > MAX_UPLOAD_BYTES) {
      throw new ValidationError('Copilot CSV exceeds the 10 MB upload limit');
    }

    const parsed = parseCopilotCsv(fileBuffer);
    if (!('rows' in parsed)) throw new ValidationError(parsed.message);
    if (parsed.rows.length === 0) throw new ValidationError('Copilot CSV contains no valid rows');

    const accounts = await db
      .selectFrom('app.financeAccounts')
      .select(['id', 'name', 'mask', 'csvImportKey'])
      .where('userId', '=', userId)
      .execute();
    const resolution = resolveCopilotAccounts(parsed.rows, accounts);
    const plan = createCopilotImportPlan(
      parsed.rows,
      resolution,
      await getExistingExternalIds(userId),
    );
    plan.invalidRows = parsed.invalidRows;
    plan.stats.invalid = parsed.invalidRows.length;
    plan.stats.total = parsed.rows.length + parsed.invalidRows.length;

    const preflightId = randomUUID();
    const planId = randomUUID();
    const preflight: ImportPreflight = {
      preflightId,
      userId,
      fileName: file.name,
      status: 'ready',
      planId,
      createdAt: Date.now(),
      expiresAt: Date.now() + PREFLIGHT_TTL_MS,
    };

    await createPreflight(preflight, fileBuffer.toString('utf8'), JSON.stringify(plan));
    return c.json(
      {
        preflight,
        plan: previewPlan(plan),
        accounts: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          mask: account.mask,
        })),
      },
      201,
    );
  })
  .get('/preflight/:preflightId', async (c) => {
    const userId = c.get('auth')?.userId;
    if (!userId) throw new UnauthorizedError('Authentication required');
    const preflightId = c.req.param('preflightId');
    const preflight = await getPreflight(preflightId, userId);
    const planContent = await getPreflightPlanContent(preflightId, userId);
    if (!preflight || !planContent) throw new ValidationError('Preflight was not found or expired');
    const accounts = await db
      .selectFrom('app.financeAccounts')
      .select(['id', 'name', 'mask'])
      .where('userId', '=', userId)
      .execute();
    return c.json({
      preflight,
      plan: previewPlan(JSON.parse(planContent) as ImportPlan),
      accounts,
    });
  })
  .delete('/preflight/:preflightId', async (c) => {
    const userId = c.get('auth')?.userId;
    if (!userId) throw new UnauthorizedError('Authentication required');
    const deleted = await deletePreflight(c.req.param('preflightId'), userId);
    if (!deleted) throw new ValidationError('Preflight was not found or expired');
    return c.json({ success: true });
  })
  .post('/preflight/:preflightId/confirm', async (c) => {
    const userId = c.get('auth')?.userId;
    if (!userId) throw new UnauthorizedError('Authentication required');
    const preflightId = c.req.param('preflightId');
    const preflight = await getPreflight(preflightId, userId);
    const planContent = await getPreflightPlanContent(preflightId, userId);
    if (!preflight || !planContent || preflight.status !== 'ready') {
      throw new ValidationError('Preflight was not found, expired, or already confirmed');
    }

    const parsedBody = confirmationSchema.safeParse(await c.req.json());
    if (!parsedBody.success) throw new ValidationError('Invalid Copilot import confirmation');
    const body = parsedBody.data;
    const plan = JSON.parse(planContent) as ImportPlan;
    const planRowIds = new Set(plan.transactions.map((transaction) => transaction.rowId));
    if (body.selectedRowIds.some((rowId) => !planRowIds.has(rowId))) {
      throw new ValidationError('Selected rows do not belong to this preflight');
    }
    const accountIds = body.mappings.flatMap((mapping) =>
      mapping.accountId ? [mapping.accountId] : [],
    );
    if (accountIds.length > 0) {
      const ownedAccounts = await db
        .selectFrom('app.financeAccounts')
        .select('id')
        .where('userId', '=', userId)
        .where('id', 'in', accountIds)
        .execute();
      if (ownedAccounts.length !== new Set(accountIds).size) {
        throw new ValidationError(
          'One or more selected accounts do not belong to the current user',
        );
      }
    }

    const mappedPlan = applyAccountMappingsToPlan(plan, body.mappings as AccountMapping[]);
    if (!(await claimPreflight(preflightId, userId))) {
      throw new ValidationError('Preflight was already confirmed');
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

    return c.json({ success: true, jobId, fileName: preflight.fileName, status: 'queued' });
  });
