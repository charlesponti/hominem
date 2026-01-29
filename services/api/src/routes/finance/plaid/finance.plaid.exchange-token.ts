import { ensureInstitutionExists, upsertPlaidItem } from '@hominem/finance-services';
import { success, error } from '@hominem/services';
import { QUEUE_NAMES } from '@hominem/utils/consts';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import type { AppEnv } from '../../../server';

import { plaidClient } from '../../../lib/plaid';

export const financePlaidExchangeTokenRoutes = new Hono<AppEnv>();

const exchangeTokenSchema = z.object({
  publicToken: z.string().min(1, 'Public token is required'),
  institutionId: z.string().min(1, 'Institution ID is required'),
  institutionName: z.string().min(1, 'Institution name is required'),
});
// Exchange public token for access token and initiate account/transaction import
financePlaidExchangeTokenRoutes.post('/', zValidator('json', exchangeTokenSchema), async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(error('UNAUTHORIZED', 'Not authorized'), 401);
  }

  const { publicToken, institutionId, institutionName } = c.req.valid('json');

  try {
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    await ensureInstitutionExists(institutionId, institutionName);

    await upsertPlaidItem({
      userId,
      itemId,
      accessToken,
      institutionId,
      status: 'active',
      lastSyncedAt: null,
    });

    // Queue sync job
    const queues = c.get('queues');
    await queues.plaidSync.add(
      QUEUE_NAMES.PLAID_SYNC,
      {
        userId,
        accessToken,
        itemId,
        initialSync: true,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: 1000, // Keep the last 1000 failed jobs
      },
    );

    return c.json(
      success({
        message: 'Successfully linked account. Your transactions will begin importing shortly.',
        institutionName,
      }),
      200,
    );
  } catch (err) {
    console.error(`Token exchange error: ${err}`);
    return c.json(error('INTERNAL_ERROR', 'Failed to exchange token'), 500);
  }
});
