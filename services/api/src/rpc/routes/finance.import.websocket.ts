import { getUserJobs, redis, type ImportTransactionsJob } from '@hominem/queues';
import { upgradeWebSocket } from '@hono/node-server';
import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';

export const importWebSocketRoutes = new Hono<AppContext>().get(
  '/ws',
  upgradeWebSocket((c) => {
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
              data?: ImportTransactionsJob[];
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
            const snapshot = await getUserJobs<ImportTransactionsJob>(userId);
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
