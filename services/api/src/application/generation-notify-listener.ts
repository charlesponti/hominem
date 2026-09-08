import { CHAT_GENERATION_EVENTS_CHANNEL, ChatGenerationRepository } from '@hominem/db/chats';
import { db, pool } from '@hominem/db/core';
import { logger } from '@hominem/telemetry';
import { isObject } from '@hominem/utils';
import pg from 'pg';

import { GenerationPubSub } from './generation-pub-sub';

// Fans out chat-generation events to this process's local SSE subscribers
// (generation-pub-sub.ts), fed by Postgres NOTIFY instead of a direct
// in-process call. ChatGenerationRepository.appendEvent fires `pg_notify`
// from inside its own transaction (atomic with the durable write), so this
// listener — one per process, on every instance — replaces the old
// single-process-only in-memory publish and makes live delivery work across
// instances, including the ~30s window every rolling deploy runs two
// instances concurrently (see railway.json's overlapSeconds).
//
// A pooled connection can't hold LISTEN state safely (the pool may recycle
// it mid-subscription), so this uses one dedicated, long-lived pg.Client,
// reconnecting on drop — Postgres does not persist LISTEN state across a
// dropped connection, so a reconnect must re-issue LISTEN.
type NotifyPointer = { generationId: string; sequence: number };

function parseNotifyPointer(payload: string | undefined): NotifyPointer | null {
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    if (
      isObject(parsed) &&
      'generationId' in parsed &&
      'sequence' in parsed &&
      typeof parsed.generationId === 'string' &&
      typeof parsed.sequence === 'number'
    ) {
      return { generationId: parsed.generationId, sequence: parsed.sequence };
    }
  } catch {
    // fall through to null below
  }
  logger.warn('generation_notify_payload_malformed', { payload });
  return null;
}

async function handleNotification(payload: string | undefined): Promise<void> {
  const pointer = parseNotifyPointer(payload);
  if (!pointer) return;
  try {
    const record = await ChatGenerationRepository.getEventBySequence(
      db,
      pointer.generationId,
      pointer.sequence,
    );
    if (record) GenerationPubSub.publish(record);
  } catch (error) {
    logger.warn('generation_notify_resolve_failed', {
      generationId: pointer.generationId,
      sequence: pointer.sequence,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

export type GenerationNotifyListener = { close: () => Promise<void> };

export function startGenerationNotifyListener(): GenerationNotifyListener {
  let client: pg.Client | null = null;
  let closed = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connectionString = pool.options.connectionString;

  async function connect(): Promise<void> {
    if (closed) return;
    const next = new pg.Client({ connectionString });
    client = next;
    // Postgres delivers NOTIFYs on this connection in commit order, and the
    // 'notification' event fires in that same order — but handling one is
    // itself async (a DB round-trip to resolve the pointer), so without
    // serializing them here, a later notification's query could resolve
    // before an earlier one's and publish out of order. Chaining onto one
    // running promise processes them one at a time, in arrival order.
    let notificationQueue: Promise<void> = Promise.resolve();
    next.on('notification', (msg) => {
      notificationQueue = notificationQueue.then(() => handleNotification(msg.payload));
    });
    next.on('error', (error) => {
      logger.warn('generation_notify_connection_error', { error: error.message });
    });
    next.on('end', () => {
      if (closed || client !== next) return;
      scheduleReconnect();
    });

    try {
      await next.connect();
      await next.query(`LISTEN ${CHAT_GENERATION_EVENTS_CHANNEL}`);
      reconnectAttempt = 0;
      logger.info('generation_notify_listener_connected');
    } catch (error) {
      logger.warn('generation_notify_listener_connect_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      if (client === next) scheduleReconnect();
    }
  }

  function scheduleReconnect(): void {
    if (closed || reconnectTimer) return;
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt, RECONNECT_MAX_DELAY_MS);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, delay);
  }

  void connect();

  return {
    close: async () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      await client?.end().catch(() => undefined);
    },
  };
}
