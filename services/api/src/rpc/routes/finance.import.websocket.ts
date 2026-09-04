import { getUserJobs, redis, type BaseJob } from '@hominem/queues';
import { upgradeWebSocket, type WebSocketLike } from '@hono/node-server';
import { Hono } from 'hono';
import type { WSEvents } from 'hono/ws';

import type { AppContext } from '../middleware/auth';

export const importWebSocketRoutes = new Hono<AppContext>().get(
  '/ws',
  // We annotate the return type here on purpose -- without it, TS has to infer
  // the shape from every onOpen/onMessage/onClose closure before it can check
  // it against upgradeWebSocket's overloads, and that's one of the slowest
  // type checks in the whole services/api build (~780ms). Annotating skips that.
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
            const parsed: { type: string; data?: BaseJob[] } = JSON.parse(message);
            const jobs = (parsed.data ?? []).filter((job) => job.userId === userId);
            if (jobs.length > 0) ws.send(JSON.stringify({ type: parsed.type, data: jobs }));
          } catch {
            // ignore bad messages, the next snapshot will fix things up
          }
        });
      },
      onMessage: async (event, ws) => {
        if (!userId) return;
        try {
          const message: { type?: string } = JSON.parse(String(event.data));
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
