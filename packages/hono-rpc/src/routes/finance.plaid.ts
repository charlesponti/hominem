import { db } from '@hominem/db';
import { plaidItems } from '@hominem/db/schema';
import {
  ensureInstitutionExists,
  getPlaidItemById,
  upsertPlaidItem,
  deletePlaidItem,
} from '@hominem/finance-services';
import { NotFoundError, ValidationError, InternalError, isServiceError } from '@hominem/services';
import { QUEUE_NAMES } from '@hominem/utils/consts';
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { env } from '../lib/env';
import { PLAID_COUNTRY_CODES, PLAID_PRODUCTS, plaidClient } from '../lib/plaid';
import { authMiddleware, type AppContext } from '../middleware/auth';
import {
  type PlaidCreateLinkTokenOutput,
  type PlaidExchangeTokenOutput,
  type PlaidSyncItemOutput,
  type PlaidRemoveConnectionOutput,
} from '../types/finance.types';

/**
 * Finance Plaid Routes
 */
export const plaidRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /create-link-token - Create link token
  .post('/create-link-token', async (c) => {
    try {
      const userId = c.get('userId')!;

      const createTokenResponse = await plaidClient.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: 'Hominem Finance',
        products: PLAID_PRODUCTS,
        country_codes: PLAID_COUNTRY_CODES,
        language: 'en',
        webhook: `${env.API_URL}/api/finance/plaid/webhook`,
      });

      return c.json<PlaidCreateLinkTokenOutput>(
        {
          linkToken: createTokenResponse.data.link_token,
          expiration: createTokenResponse.data.expiration,
          requestId: createTokenResponse.data.request_id,
        },
        200,
      );
    } catch (error) {
      return c.json(
        {
          error: 'Failed to create link token',
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  })

  // POST /exchange-token - Exchange public token
  .post('/exchange-token', zValidator('json', z.object({
    publicToken: z.string().min(1),
    institutionId: z.string().min(1),
    institutionName: z.string().min(1),
  })), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;
    const queues = c.get('queues');

    if (!queues) {
      throw new InternalError('Queues not available');
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: input.publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Ensure institution exists
    await ensureInstitutionExists(input.institutionId, input.institutionName);

    // Save Plaid item
    await upsertPlaidItem({
      userId,
      itemId,
      accessToken,
      institutionId: input.institutionId,
      status: 'active',
      lastSyncedAt: null,
    });

    // Queue sync job
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
        removeOnFail: 1000,
      },
    );

    return c.json<PlaidExchangeTokenOutput>(
      {
        accessToken,
        itemId,
        requestId: exchangeResponse.data.request_id,
      },
      200,
    );
  })

  // POST /sync-item - Sync Plaid item
  .post('/sync-item', zValidator('json', z.object({ itemId: z.string() })), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;
    const queues = c.get('queues');

    if (!queues) {
      throw new InternalError('Queues not available');
    }

    // Get the plaid item
    const plaidItem = await getPlaidItemById(input.itemId, userId);

    if (!plaidItem) {
      throw new NotFoundError('Plaid item not found');
    }

    // Queue sync job
    await queues.plaidSync.add(
      QUEUE_NAMES.PLAID_SYNC,
      {
        userId,
        accessToken: plaidItem.accessToken,
        itemId: plaidItem.itemId,
        initialSync: false,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );

    return c.json<PlaidSyncItemOutput>(
      {
        success: true,
        added: 0, // Async, so we don't know yet
        modified: 0,
        removed: 0,
      },
      200,
    );
  })

  // POST /remove-connection - Remove connection
  .post('/remove-connection', zValidator('json', z.object({ itemId: z.string() })), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;

    // Get the plaid item
    const plaidItem = await db.query.plaidItems.findFirst({
      where: and(
        eq(plaidItems.id, input.itemId),
        eq(plaidItems.userId, userId),
      ),
    });

    if (!plaidItem) {
      throw new NotFoundError('Plaid item not found');
    }

    // Revoke access token with Plaid
    try {
      await plaidClient.itemAccessTokenInvalidate({
        access_token: plaidItem.accessToken,
      });
    } catch (revokeError) {
      console.warn('Failed to revoke Plaid access token:', revokeError);
    }

    // Delete the plaid item
    await deletePlaidItem(input.itemId, userId);

    return c.json<PlaidRemoveConnectionOutput>({ success: true }, 200);
  });
