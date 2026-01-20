import { createServer } from '@hominem/trpc';
import { env } from '@hominem/trpc/lib/env';
import { serve } from '@hono/node-server';

const app = createServer();
const port = env.PORT;

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port: Number(port),
  maxRequestBodySize: 200 * 1024 * 1024, // 200MB to allow for large file uploads
  overrideGlobalObjects: false,
});
