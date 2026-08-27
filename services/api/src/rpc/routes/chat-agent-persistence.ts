import { db, sql, type Json } from '@hominem/db';
import type {
  ModelMessage,
  RunRecord,
  RunStore,
  RunStatus,
  StreamChunk,
  StreamDurability,
} from '@tanstack/ai';
import type { InterruptCommitEntry, InterruptRecord, MessageStore } from '@tanstack/ai-persistence';
import {
  defineAIPersistence,
  defineInterruptStore,
  defineMessageStore,
  defineRunStore,
  withPersistence,
} from '@tanstack/ai-persistence';

const json = (value: unknown) => value as Json;

function toRun(row: {
  runId: string;
  threadId: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  error: Json | null;
  usage: Json | null;
  cancelRequested: boolean;
}): RunRecord {
  return {
    runId: row.runId,
    threadId: row.threadId,
    status: row.status as RunStatus,
    startedAt: new Date(row.startedAt).getTime(),
    ...(row.finishedAt ? { finishedAt: new Date(row.finishedAt).getTime() } : {}),
    ...(row.error ? { error: row.error as unknown as RunRecord['error'] } : {}),
    ...(row.usage ? { usage: row.usage as unknown as RunRecord['usage'] } : {}),
    ...(row.cancelRequested ? { cancelRequested: true } : {}),
  };
}

export function createChatPersistence(ownerUserId: string) {
  const messages: MessageStore = defineMessageStore({
    async loadThread(threadId) {
      await assertThreadOwner(threadId);
      const rows = await db
        .selectFrom('app.aiChatMessages')
        .select(['message'])
        .where('threadId', '=', threadId)
        .orderBy('createdAt', 'asc')
        .orderBy('id', 'asc')
        .execute();
      return rows.map((row) => row.message as unknown as ModelMessage);
    },
    async saveThread(threadId, transcript) {
      await assertThreadOwner(threadId, true);
      await db
        .insertInto('app.aiChatThreads')
        .values({ threadId, ownerUserId })
        .onConflict((oc) => oc.column('threadId').doNothing())
        .execute();

      await db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('app.aiChatMessages')
          .select(['id', 'message'])
          .where('threadId', '=', threadId)
          .orderBy('createdAt', 'asc')
          .orderBy('id', 'asc')
          .execute();
        const retained = new Set<string>();
        for (const [index, message] of transcript.entries()) {
          const messageId =
            message.id ?? existing[index]?.id ?? `${threadId}:${index}:${message.role}`;
          retained.add(messageId);
          await trx
            .insertInto('app.aiChatMessages')
            .values({ id: messageId, threadId, message: json(message) })
            .onConflict((oc) => oc.column('id').doUpdateSet({ message: json(message) }))
            .execute();
        }
        if (retained.size > 0) {
          await trx
            .deleteFrom('app.aiChatMessages')
            .where('threadId', '=', threadId)
            .where('id', 'not in', [...retained])
            .execute();
        } else {
          await trx.deleteFrom('app.aiChatMessages').where('threadId', '=', threadId).execute();
        }
      });
    },
  });

  const runs = defineRunStore({
    async createOrResume(input) {
      await assertThreadOwner(input.threadId, true);
      await db
        .insertInto('app.aiChatThreads')
        .values({ threadId: input.threadId, ownerUserId })
        .onConflict((oc) => oc.column('threadId').doNothing())
        .execute();
      await db
        .insertInto('app.aiChatRuns')
        .values({
          runId: input.runId,
          threadId: input.threadId,
          status: input.status ?? 'running',
          startedAt: new Date(input.startedAt),
        })
        .onConflict((oc) => oc.column('runId').doNothing())
        .execute();
      const row = await db
        .selectFrom('app.aiChatRuns as run')
        .innerJoin('app.aiChatThreads as thread', 'thread.threadId', 'run.threadId')
        .selectAll('run')
        .where('run.runId', '=', input.runId)
        .where('thread.ownerUserId', '=', ownerUserId)
        .executeTakeFirstOrThrow();
      return toRun(row);
    },
    async update(runId, patch) {
      await db
        .updateTable('app.aiChatRuns')
        .set({
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.finishedAt ? { finishedAt: new Date(patch.finishedAt) } : {}),
          ...(patch.error ? { error: json(patch.error) } : {}),
          ...(patch.usage ? { usage: json(patch.usage) } : {}),
          ...(patch.cancelRequested === undefined
            ? {}
            : { cancelRequested: patch.cancelRequested }),
        })
        .where('runId', '=', runId)
        .where('threadId', 'in', (eb) =>
          eb
            .selectFrom('app.aiChatThreads')
            .select('threadId')
            .where('ownerUserId', '=', ownerUserId),
        )
        .execute();
    },
    async get(runId) {
      const row = await db
        .selectFrom('app.aiChatRuns as run')
        .innerJoin('app.aiChatThreads as thread', 'thread.threadId', 'run.threadId')
        .selectAll('run')
        .where('run.runId', '=', runId)
        .where('thread.ownerUserId', '=', ownerUserId)
        .executeTakeFirst();
      return row ? toRun(row) : null;
    },
    async findActiveRun(threadId) {
      await assertThreadOwner(threadId);
      const row = await db
        .selectFrom('app.aiChatRuns')
        .selectAll()
        .where('threadId', '=', threadId)
        .where('status', '=', 'running')
        .orderBy('startedAt', 'desc')
        .executeTakeFirst();
      return row ? toRun(row) : null;
    },
  });

  const interrupts = defineInterruptStore({
    async create(record) {
      await assertThreadOwner(record.threadId);
      await db
        .insertInto('app.aiChatInterrupts')
        .values({
          interruptId: record.interruptId,
          runId: record.runId,
          threadId: record.threadId,
          payload: json(record.payload),
        })
        .onConflict((oc) => oc.column('interruptId').doNothing())
        .execute();
    },
    async resolve(interruptId, response) {
      await db
        .updateTable('app.aiChatInterrupts')
        .set({ status: 'resolved', resolvedAt: new Date(), response: json(response) })
        .where('interruptId', '=', interruptId)
        .where('status', '=', 'pending')
        .where('threadId', 'in', (eb) =>
          eb
            .selectFrom('app.aiChatThreads')
            .select('threadId')
            .where('ownerUserId', '=', ownerUserId),
        )
        .execute();
    },
    async cancel(interruptId) {
      await db
        .updateTable('app.aiChatInterrupts')
        .set({ status: 'cancelled', resolvedAt: new Date() })
        .where('interruptId', '=', interruptId)
        .where('status', '=', 'pending')
        .where('threadId', 'in', (eb) =>
          eb
            .selectFrom('app.aiChatThreads')
            .select('threadId')
            .where('ownerUserId', '=', ownerUserId),
        )
        .execute();
    },
    async commitBatch(entries: ReadonlyArray<InterruptCommitEntry>) {
      await db.transaction().execute(async (trx) => {
        for (const entry of entries) {
          const result = await trx
            .updateTable('app.aiChatInterrupts')
            .set(
              entry.status === 'resolved'
                ? { status: 'resolved', resolvedAt: new Date(), response: json(entry.response) }
                : { status: 'cancelled', resolvedAt: new Date() },
            )
            .where('interruptId', '=', entry.interruptId)
            .where('status', '=', 'pending')
            .executeTakeFirst();
          if (Number(result.numUpdatedRows) !== 1)
            throw new Error('Interrupt batch is no longer pending');
        }
      });
    },
    async get(interruptId) {
      const row = await db
        .selectFrom('app.aiChatInterrupts as interrupt')
        .innerJoin('app.aiChatThreads as thread', 'thread.threadId', 'interrupt.threadId')
        .selectAll('interrupt')
        .where('interrupt.interruptId', '=', interruptId)
        .where('thread.ownerUserId', '=', ownerUserId)
        .executeTakeFirst();
      return row
        ? ({
            ...row,
            requestedAt: new Date(row.requestedAt).getTime(),
            resolvedAt: row.resolvedAt ? new Date(row.resolvedAt).getTime() : undefined,
          } as unknown as InterruptRecord)
        : null;
    },
    async list(threadId) {
      return listInterrupts(threadId);
    },
    async listPending(threadId) {
      return listInterrupts(threadId, 'pending');
    },
    async listByRun(runId) {
      return listInterrupts(undefined, undefined, runId);
    },
    async listPendingByRun(runId) {
      return listInterrupts(undefined, 'pending', runId);
    },
  });

  async function listInterrupts(threadId?: string, status?: string, runId?: string) {
    if (threadId) await assertThreadOwner(threadId);
    if (runId) {
      const run = await db
        .selectFrom('app.aiChatRuns as run')
        .innerJoin('app.aiChatThreads as thread', 'thread.threadId', 'run.threadId')
        .select('run.runId')
        .where('run.runId', '=', runId)
        .where('thread.ownerUserId', '=', ownerUserId)
        .executeTakeFirst();
      if (!run) return [];
    }
    let query = db.selectFrom('app.aiChatInterrupts').selectAll().orderBy('requestedAt', 'asc');
    if (threadId) query = query.where('threadId', '=', threadId);
    if (runId) query = query.where('runId', '=', runId);
    if (status) query = query.where('status', '=', status);
    const rows = await query.execute();
    return rows.map((row) => ({
      interruptId: row.interruptId,
      runId: row.runId,
      threadId: row.threadId,
      status: row.status as InterruptRecord['status'],
      requestedAt: new Date(row.requestedAt).getTime(),
      ...(row.resolvedAt ? { resolvedAt: new Date(row.resolvedAt).getTime() } : {}),
      payload: row.payload as Record<string, unknown>,
      ...(row.response !== null ? { response: row.response } : {}),
    }));
  }

  async function assertThreadOwner(threadId: string, create = false) {
    const thread = await db
      .selectFrom('app.aiChatThreads')
      .select('ownerUserId')
      .where('threadId', '=', threadId)
      .executeTakeFirst();
    if (thread?.ownerUserId === ownerUserId) return;
    if (!thread && create) return;
    throw new Error('AI chat thread is not owned by the current user');
  }

  return defineAIPersistence({ stores: { messages, runs, interrupts } });
}

export function withChatPersistence(ownerUserId: string) {
  return withPersistence(createChatPersistence(ownerUserId));
}

/**
 * The delivery adapter can receive a terminal error before TanStack's
 * persistence middleware reaches its init hook. Create the run eagerly so
 * every producer-side stream append has an owner-scoped runtime row to join.
 */
export async function ensureChatRun(input: {
  ownerUserId: string;
  threadId: string;
  runId: string;
}) {
  const thread = await db
    .selectFrom('app.aiChatThreads')
    .select('ownerUserId')
    .where('threadId', '=', input.threadId)
    .executeTakeFirst();
  if (thread && thread.ownerUserId !== input.ownerUserId) {
    throw new Error('AI chat thread is not owned by the current user');
  }

  await db.transaction().execute(async (trx) => {
    if (!thread) {
      await trx
        .insertInto('app.aiChatThreads')
        .values({ threadId: input.threadId, ownerUserId: input.ownerUserId })
        .onConflict((oc) => oc.column('threadId').doNothing())
        .execute();
    }

    const result = await trx
      .insertInto('app.aiChatRuns')
      .values({
        runId: input.runId,
        threadId: input.threadId,
        status: 'running',
        startedAt: new Date(),
      })
      .onConflict((oc) => oc.column('runId').doNothing())
      .executeTakeFirst();

    if (Number(result.numInsertedOrUpdatedRows ?? 0) === 0) {
      const existing = await trx
        .selectFrom('app.aiChatRuns')
        .select(['threadId'])
        .where('runId', '=', input.runId)
        .executeTakeFirst();
      if (!existing || existing.threadId !== input.threadId) {
        throw new Error('AI chat run does not belong to the current thread');
      }
    }
  });
}

export async function getOwnedChatRun(ownerUserId: string, runId: string) {
  return db
    .selectFrom('app.aiChatRuns as run')
    .innerJoin('app.aiChatThreads as thread', 'thread.threadId', 'run.threadId')
    .select(['run.runId', 'run.threadId', 'run.status'])
    .where('run.runId', '=', runId)
    .where('thread.ownerUserId', '=', ownerUserId)
    .executeTakeFirst();
}

export function getChatRunStore(ownerUserId: string): RunStore {
  return {
    async update(runId, patch) {
      const run = await db
        .selectFrom('app.aiChatRuns as run')
        .innerJoin('app.aiChatThreads as thread', 'thread.threadId', 'run.threadId')
        .select(['run.runId', 'thread.ownerUserId'])
        .where('run.runId', '=', runId)
        .executeTakeFirst();
      if (!run || run.ownerUserId !== ownerUserId) return;
      await db
        .updateTable('app.aiChatRuns')
        .set({
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.finishedAt ? { finishedAt: new Date(patch.finishedAt) } : {}),
          ...(patch.error ? { error: json(patch.error) } : {}),
          ...(patch.usage ? { usage: json(patch.usage) } : {}),
          ...(patch.cancelRequested === undefined
            ? {}
            : { cancelRequested: patch.cancelRequested }),
        })
        .where('runId', '=', runId)
        .execute();
    },
  } as RunStore;
}

export function createChatStreamDurability(
  request: Request,
  runId: string,
  ownerUserId: string,
): StreamDurability {
  const resumeFrom = () =>
    request.headers.get('Last-Event-ID') ?? new URL(request.url).searchParams.get('offset');
  const sequenceFrom = (offset: string | null) => (offset ? Number(offset) : 0);
  return {
    resumeFrom,
    async append(chunks) {
      const rows = chunks.map((chunk, index) => ({
        runId,
        sequence: BigInt(index + 1),
        payload: json(chunk),
      }));
      if (rows.length === 0) return [];
      return db.transaction().execute(async (trx) => {
        const run = await trx
          .selectFrom('app.aiChatRuns as run')
          .innerJoin('app.aiChatThreads as thread', 'thread.threadId', 'run.threadId')
          .select('run.runId')
          .where('run.runId', '=', runId)
          .where('thread.ownerUserId', '=', ownerUserId)
          .executeTakeFirst();
        if (!run) throw new Error('AI chat run is not owned by the current user');
        await sql`select pg_advisory_xact_lock(hashtext(${runId}))`.execute(trx);
        const existing = await trx
          .selectFrom('app.aiChatStreamEvents')
          .select('sequence')
          .where('runId', '=', runId)
          .orderBy('sequence', 'desc')
          .executeTakeFirst();
        const start = existing ? Number(existing.sequence) : 0;
        const values = rows.map((row, index) => ({ ...row, sequence: BigInt(start + index + 1) }));
        await trx.insertInto('app.aiChatStreamEvents').values(values).execute();
        return values.map((row) => String(row.sequence));
      });
    },
    async *read(offset, signal) {
      let next = sequenceFrom(offset);
      while (!signal?.aborted) {
        const rows = await db
          .selectFrom('app.aiChatStreamEvents as event')
          .innerJoin('app.aiChatRuns as run', 'run.runId', 'event.runId')
          .innerJoin('app.aiChatThreads as thread', 'thread.threadId', 'run.threadId')
          .selectAll('event')
          .where('event.runId', '=', runId)
          .where('thread.ownerUserId', '=', ownerUserId)
          .where('event.sequence', '>', String(next))
          .orderBy('event.sequence', 'asc')
          .execute();
        for (const row of rows) {
          next = Number(row.sequence);
          yield { offset: String(row.sequence), chunk: row.payload as unknown as StreamChunk };
        }
        const run = await db
          .selectFrom('app.aiChatRuns as run')
          .innerJoin('app.aiChatThreads as thread', 'thread.threadId', 'run.threadId')
          .select('run.status')
          .where('run.runId', '=', runId)
          .where('thread.ownerUserId', '=', ownerUserId)
          .executeTakeFirst();
        if (run && run.status !== 'running' && rows.length === 0) return;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    },
    async close() {},
    async snapshot() {
      const rows = await db
        .selectFrom('app.aiChatStreamEvents as event')
        .innerJoin('app.aiChatRuns as run', 'run.runId', 'event.runId')
        .innerJoin('app.aiChatThreads as thread', 'thread.threadId', 'run.threadId')
        .selectAll('event')
        .where('event.runId', '=', runId)
        .where('thread.ownerUserId', '=', ownerUserId)
        .orderBy('event.sequence', 'asc')
        .execute();
      return rows.map((row) => ({
        offset: String(row.sequence),
        chunk: row.payload as unknown as StreamChunk,
      }));
    },
  };
}
