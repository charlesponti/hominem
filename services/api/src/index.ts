import { logger } from '@hominem/utils/logger';
import { serve } from '@hono/node-server';

import { env } from './env';
import { createServer } from './server';

const app = createServer();
const port = Number.parseInt(env.PORT, 10);
const host = '0.0.0.0';

logger.info('server_started', { host, port });

serve({
  fetch: app.fetch,
  port,
  hostname: host,
  overrideGlobalObjects: false,
});
