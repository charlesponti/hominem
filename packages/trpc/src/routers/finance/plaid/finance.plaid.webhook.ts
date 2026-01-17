import { getPlaidItemByItemId, updatePlaidItemStatusByItemId } from '@hominem/finance-services';
import { QUEUE_NAMES } from '@hominem/utils/consts';
import { Hono } from 'hono';
import { z } from 'zod';

import { verifyPlaidWebhookSignature } from '../../../lib/plaid';

const webhookSchema = z.object({
  webhook_type: z.string(),
  webhook_code: z.string(),
  item_id: z.string(),
  error: z
    .object({
      error_code: z.string(),
      error_message: z.string(),
    })
    .optional(),
});

export const financePlaidWebhookRoutes = new Hono();

// Handle Plaid webhooks
financePlaidWebhookRoutes.post('/', async (c) => {
  // Get raw body for signature verification
  const rawBody = await c.req.text();
  const headers = Object.fromEntries(c.req.raw.headers.entries());

  // Verify webhook signature
  if (!verifyPlaidWebhookSignature(headers, rawBody)) {
    return c.json({ error: 'Invalid webhook signature' }, 401);
  }

  // Parse and validate the JSON body
  let parsedBody: Record<string, unknown>;
  try {
    parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const parseResult = webhookSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    return c.json({ error: 'Invalid webhook payload' }, 400);
  }

  const { webhook_type, webhook_code, item_id, error } = parseResult.data;

  try {
    // Find the plaid item
    const plaidItem = await getPlaidItemByItemId(item_id);

    if (!plaidItem) {
      console.warn(`Plaid item ${item_id} not found for webhook`);
      return c.json({ success: true }); // Return success to prevent retries
    }

    // Handle different webhook types
    if (webhook_type === 'TRANSACTIONS') {
      if (webhook_code === 'INITIAL_UPDATE' || webhook_code === 'HISTORICAL_UPDATE') {
        // Queue sync job for transaction updates
        const queues = c.get('queues');
        await queues.plaidSync.add(
          QUEUE_NAMES.PLAID_SYNC,
          {
            userId: plaidItem.userId,
            accessToken: plaidItem.accessToken,
            itemId: item_id,
            initialSync: webhook_code === 'INITIAL_UPDATE',
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
      } else if (webhook_code === 'DEFAULT_UPDATE') {
        // Regular transaction update - queue sync job
        const queues = c.get('queues');
        await queues.plaidSync.add(
          QUEUE_NAMES.PLAID_SYNC,
          {
            userId: plaidItem.userId,
            accessToken: plaidItem.accessToken,
            itemId: item_id,
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
      }
    } else if (webhook_type === 'ITEM') {
      if (webhook_code === 'ERROR') {
        // Update item status to error
        await updatePlaidItemStatusByItemId(item_id, {
          status: 'error',
          error: error ? `${error.error_code}: ${error.error_message}` : 'Unknown error',
          updatedAt: new Date(),
        });
      } else if (webhook_code === 'PENDING_EXPIRATION') {
        // Update item status to pending expiration
        await updatePlaidItemStatusByItemId(item_id, {
          status: 'pending_expiration',
          updatedAt: new Date(),
        });
      }
    }

    return c.json({ success: true });
  } catch (webhookError) {
    console.error(`Webhook processing error: ${webhookError}`);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});
