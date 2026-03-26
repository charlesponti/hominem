import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { exchangePlaidPublicToken, requirePlaidUserId } from '../../../lib/plaid-actions';
import type { AppEnv } from '../../../server';

export const financePlaidExchangeTokenRoutes = new Hono<AppEnv>();

const exchangeTokenSchema = z.object({
  publicToken: z.string().min(1, 'Public token is required'),
  institutionId: z.string().min(1, 'Institution ID is required'),
  institutionName: z.string().min(1, 'Institution name is required'),
});
// Exchange public token for access token and initiate account/transaction import
financePlaidExchangeTokenRoutes.post('/', zValidator('json', exchangeTokenSchema), async (c) => {
  const { publicToken, institutionId, institutionName } = c.req.valid('json');

  const userId = requirePlaidUserId(c.get('userId'));

  return c.json(
    await exchangePlaidPublicToken({
      userId,
      publicToken,
      institutionId,
      institutionName,
    }),
  );
});
