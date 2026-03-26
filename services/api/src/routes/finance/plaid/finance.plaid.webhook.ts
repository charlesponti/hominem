import { Hono } from 'hono';

import { handlePlaidWebhook } from '../../../lib/plaid-actions';
import type { AppEnv } from '../../../server';

export const financePlaidWebhookRoutes = new Hono<AppEnv>();

// Handle Plaid webhooks
financePlaidWebhookRoutes.post('/', async (c) => {
  const rawBody = await c.req.text();
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  return c.json(await handlePlaidWebhook({ headers, rawBody }));
});
