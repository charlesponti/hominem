import { CHAT_GENERATION_EVENTS_CHANNEL, ChatGenerationRepository } from '@hominem/db/chats';
import type { ChatGenerationEventRecord } from '@hominem/db/chats';
import { db, pool } from '@hominem/db/core';
import { logger } from '@hominem/telemetry';
import { isObject } from '@hominem/utils';
import pg from 'pg';

// Delivers durable chat-generation events to this process's local SSE
// subscribers, fed by Postgres NOTIFY rather than a direct in-process call.
// ChatGenerationRepository.appendEvent fires `pg_notify` from inside its own
// transaction (atomic with the durable write); `start()` below LISTENs for
// that and republishes to `subscribe()`'s local subscribers. That means
// every event — including one produced by THIS process — only reaches a
// subscriber by going out to Postgres and back. There is no local-write
// shortcut: it's what makes delivery work the same way whether the
// generation and the SSE connection live on the same instance or not,
// including the ~30s window every rolling deploy runs two instances
// concurrently (see railway.json's overlapSeconds).

type Subscriber = {
  queue: ChatGenerationEventRecord[];
  waiters: Array<(event: ChatGenerationEventRecord | null) => void>;
  closed: boolean;
};

const subscribers = new Map<string, Set<Subscriber>>();

function closeSubscriber(generationId: string, subscriber: Subscriber): void {
  subscriber.closed = true;
  for (const resolve of subscriber.waiters.splice(0)) resolve(null);
  const generationSubscribers = subscribers.get(generationId);
  generationSubscribers?.delete(subscriber);
  if (generationSubscribers?.size === 0) subscribers.delete(generationId);
}

function publish(event: ChatGenerationEventRecord): void {
  for (const subscriber of subscribers.get(event.generationId) ?? []) {
    const resolve = subscriber.waiters.shift();
    if (resolve) resolve(event);
    else subscriber.queue.push(event);
  }
}

function subscribe(
  generationId: string,
): AsyncIterable<ChatGenerationEventRecord> & { close: () => void } {
  const subscriber: Subscriber = { queue: [], waiters: [], closed: false };
  const generationSubscribers = subscribers.get(generationId) ?? new Set<Subscriber>();
  generationSubscribers.add(subscriber);
  subscribers.set(generationId, generationSubscribers);

  return {
    close: () => closeSubscriber(generationId, subscriber),
    [Symbol.asyncIterator]() {
      return {
        next: async () => {
          if (subscriber.queue.length > 0) {
            return { done: false, value: subscriber.queue.shift()! };
          }
          if (subscriber.closed) return { done: true, value: undefined };
          const event = await new Promise<ChatGenerationEventRecord | null>((resolve) => {
            subscriber.waiters.push(resolve);
          });
          return event ? { done: false, value: event } : { done: true, value: undefined };
        },
        // called when a for-await loop breaks/returns early — also closes the subscription
        return: async () => {
          closeSubscriber(generationId, subscriber);
          return { done: true, value: undefined };
        },
      };
    },
  };
}

// --- Postgres LISTEN/NOTIFY: the only producer that ever calls publish() above ---

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
    if (record) publish(record);
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

let client: pg.Client | null = null;
let closed = true;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

async function connect(): Promise<void> {
  if (closed) return;
  const next = new pg.Client({ connectionString: pool.options.connectionString });
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

function start(): void {
  closed = false;
  reconnectAttempt = 0;
  void connect();
}

async function stop(): Promise<void> {
  closed = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  await client?.end().catch(() => undefined);
  client = null;
}

export const ChatGenerationStore = {
  subscribe,
  publish,
  start,
  stop,
};
