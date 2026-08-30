import { getUserJobs, redis, type BaseJob } from '@hominem/queues';
import { upgradeWebSocket, type WebSocketLike } from '@hono/node-server';
import { Hono } from 'hono';
import type { WSEvents } from 'hono/ws';

import type { AppContext } from '../middleware/auth';

export const importWebSocketRoutes = new Hono<AppContext>().get(
  '/ws',
  // Explicit return type: without it, TS infers this callback's return shape
  // bottom-up (including every onOpen/onMessage/onClose closure) before
  // comparing it against upgradeWebSocket's overloads -- one of the most
  // expensive single checkExpression spans in the whole services/api
  // typecheck (~780ms). Annotating gives each handler a contextual type
  // upfront instead.
  upgradeWebSocket((c): WSEvents<WebSocketLike> => {
    const userId = c.get('auth')?.userId;
    let subscriber: ReturnType<typeof redis.duplicate> | null = null;

    return {
      onOpen: async (_event, ws) => {
        if (!userId) {
          ws.close(1008, 'Authentication required');
          return;
        }
        subscriber = redis.duplicate();
        await subscriber.subscribe('import:progress');
        subscriber.on('message', (_channel: string, message: string) => {
          try {
            const parsed = JSON.parse(message) as {
              type: string;
              data?: BaseJob[];
            };
            const jobs = (parsed.data ?? []).filter((job) => job.userId === userId);
            if (jobs.length > 0) ws.send(JSON.stringify({ type: parsed.type, data: jobs }));
          } catch {
            // Ignore malformed pub/sub messages; the next snapshot remains authoritative.
          }
        });
      },
      onMessage: async (event, ws) => {
        if (!userId) return;
        try {
          const message = JSON.parse(String(event.data)) as { type?: string };
          if (message.type === 'subscribe') {
            const snapshot = await getUserJobs<BaseJob>(userId);
            ws.send(JSON.stringify({ type: 'subscribed', data: snapshot.jobs }));
          }
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid WebSocket message' }));
        }
      },
      onClose: async () => {
        if (subscriber) await subscriber.quit();
      },
    };
  }),
);
