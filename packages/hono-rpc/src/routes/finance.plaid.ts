import { db } from '@hominem/db';
import { plaidItems } from '@hominem/db/schema';
import {
  ensureInstitutionExists,
  getPlaidItemById,
  upsertPlaidItem,
  deletePlaidItem,
} from '@hominem/finance-services';
import { QUEUE_NAMES } from '@hominem/utils/consts';
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { env } from '../lib/env';
import { PLAID_COUNTRY_CODES, PLAID_PRODUCTS, plaidClient } from '../lib/plaid';
import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Finance Plaid Routes
 *
 * Handles Plaid integration operations:
 * - POST /create-link-token - Create Plaid link token
 * - POST /exchange-token - Exchange public token for access token
 * - POST /sync-item - Sync Plaid item
 * - POST /remove-connection - Remove Plaid connection
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const exchangeTokenSchema = z.object({
  publicToken: z.string().min(1, 'Public token is required'),
  institutionId: z.string().min(1, 'Institution ID is required'),
  institutionName: z.string().min(1, 'Institution name is required'),
});

const syncItemSchema = z.object({
  itemId: z.string(),
});

const removeConnectionSchema = z.object({
  itemId: z.string(),
});

// ============================================================================
// Routes
// ============================================================================

export const plaidRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /create-link-token - Create link token
  .post('/create-link-token', async (c) => {
    const userId = c.get('userId')!;

    try {
      const createTokenResponse = await plaidClient.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: 'Hominem Finance',
        products: PLAID_PRODUCTS,
        country_codes: PLAID_COUNTRY_CODES,
        language: 'en',
        webhook: `${env.API_URL}/api/finance/plaid/webhook`,
      });

      const result = {
        success: true,
        linkToken: createTokenResponse.data.link_token,
        expiration: createTokenResponse.data.expiration,
      };

      return c.json(result);
    } catch (error) {
      console.error('Failed to create Plaid link token:', error);
      return c.json({ error: 'Failed to create link token' }, 500);
    }
  })

  // POST /exchange-token - Exchange public token
  .post('/exchange-token', zValidator('json', exchangeTokenSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const queues = c.get('queues');

    try {
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

      const result = {
        success: true,
        message: 'Successfully linked account. Your transactions will begin importing shortly.',
        institutionName: input.institutionName,
      };

      return c.json(result);
    } catch (error) {
      console.error('Token exchange error:', error);
      return c.json({ error: 'Failed to exchange token' }, 500);
    }
  })

  // POST /sync-item - Sync Plaid item
  .post('/sync-item', zValidator('json', syncItemSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const queues = c.get('queues');

    try {
      // Get the plaid item
      const plaidItem = await getPlaidItemById(input.itemId, userId);

      if (!plaidItem) {
        return c.json({ error: 'Plaid item not found' }, 404);
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

      const result = {
        success: true,
        message: 'Sync job queued successfully',
      };

      return c.json(result);
    } catch (error) {
      console.error('Sync error:', error);
      return c.json({ error: 'Failed to sync item' }, 500);
    }
  })

  // POST /remove-connection - Remove connection
  .post('/remove-connection', zValidator('json', removeConnectionSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      // Get the plaid item
      const plaidItem = await db.query.plaidItems.findFirst({
        where: and(
          eq(plaidItems.id as any, input.itemId),
          eq(plaidItems.userId as any, userId),
        ) as any,
      });

      if (!plaidItem) {
        return c.json({ error: 'Plaid item not found' }, 404);
      }

      // Revoke access token with Plaid
      try {
        await plaidClient.itemAccessTokenInvalidate({
          access_token: plaidItem.accessToken,
        });
      } catch (error) {
        console.warn('Failed to revoke Plaid access token:', error);
        // Continue with removal even if Plaid revocation fails
      }

      // Delete the plaid item
      await deletePlaidItem(input.itemId, userId);

      const result = {
        success: true,
        message: 'Successfully removed Plaid connection',
      };

      return c.json(result);
    } catch (error) {
      console.error('Remove connection error:', error);
      return c.json({ error: 'Failed to remove connection' }, 500);
    }
  });
