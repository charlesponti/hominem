import { logger, LOG_MESSAGES } from '@hominem/telemetry';
import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';

import { env } from './env';
import { initRuntime } from './runtime';
import { createServer } from './server';

const app = createServer();
const port = env.PORT ?? 4040;
const host = '0.0.0.0';
const websocketServer = new WebSocketServer({ noServer: true });

logger.info(LOG_MESSAGES.SERVER_STARTED, { host, port });

serve({
  fetch: app.fetch,
  port,
  hostname: host,
  websocket: { server: websocketServer },
  overrideGlobalObjects: false,
});

initRuntime('api').installSignalHandlers();
