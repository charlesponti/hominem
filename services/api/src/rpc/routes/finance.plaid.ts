import {
  type PlaidCreateLinkTokenOutput,
  type PlaidExchangeTokenOutput,
  type PlaidSyncItemOutput,
  type PlaidRemoveConnectionOutput,
} from '@hominem/rpc/types/finance.types';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import {
  createPlaidLinkToken,
  disconnectPlaidConnection,
  exchangePlaidPublicToken,
  requirePlaidUserId,
  syncPlaidItem,
} from '../../lib/plaid-actions';
import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Finance Plaid Routes
 */
export const plaidRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /create-link-token - Create link token
  .post('/create-link-token', async (c) => {
    const userId = requirePlaidUserId(c.get('userId'));
    return c.json<PlaidCreateLinkTokenOutput>(await createPlaidLinkToken(userId), 200);
  })

  // POST /exchange-token - Exchange public token
  .post(
    '/exchange-token',
    zValidator(
      'json',
      z.object({
        publicToken: z.string().min(1),
        institutionId: z.string().min(1),
        institutionName: z.string().min(1),
      }),
    ),
    async (c) => {
      const input = c.req.valid('json');
      const userId = requirePlaidUserId(c.get('userId'));

      return c.json<PlaidExchangeTokenOutput>(
        await exchangePlaidPublicToken({
          userId,
          publicToken: input.publicToken,
          institutionId: input.institutionId ?? '',
          institutionName: input.institutionName,
        }),
        200,
      );
    },
  )

  // POST /sync-item - Sync Plaid item
  .post('/sync-item', zValidator('json', z.object({ itemId: z.string() })), async (c) => {
    const input = c.req.valid('json');
    const userId = requirePlaidUserId(c.get('userId'));

    return c.json<PlaidSyncItemOutput>(await syncPlaidItem({ userId, itemId: input.itemId }), 200);
  })

  // POST /remove-connection - Remove connection
  .post('/remove-connection', zValidator('json', z.object({ itemId: z.string() })), async (c) => {
    const input = c.req.valid('json');
    const userId = requirePlaidUserId(c.get('userId'));

    return c.json<PlaidRemoveConnectionOutput>(
      await disconnectPlaidConnection({ userId, itemId: input.itemId }),
      200,
    );
  });
