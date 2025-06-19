import { QUEUE_NAMES } from '@hominem/utils/consts'
import { db } from '@hominem/utils/db'
import { plaidItems } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

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
})

export const financePlaidWebhookRoutes = new Hono()

// Handle Plaid webhooks
financePlaidWebhookRoutes.post('/', zValidator('json', webhookSchema), async (c) => {
  const { webhook_type, webhook_code, item_id, error } = c.req.valid('json')

  try {
    // Find the plaid item
    const plaidItem = await db.query.plaidItems.findFirst({
      where: eq(plaidItems.itemId, item_id),
    })

    if (!plaidItem) {
      console.warn(`Plaid item ${item_id} not found for webhook`)
      return c.json({ success: true }) // Return success to prevent retries
    }

    // Handle different webhook types
    if (webhook_type === 'TRANSACTIONS') {
      if (webhook_code === 'INITIAL_UPDATE' || webhook_code === 'HISTORICAL_UPDATE') {
        // Queue sync job for transaction updates
        const queues = c.get('queues')
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
          }
        )
      } else if (webhook_code === 'DEFAULT_UPDATE') {
        // Regular transaction update - queue sync job
        const queues = c.get('queues')
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
          }
        )
      }
    } else if (webhook_type === 'ITEM') {
      if (webhook_code === 'ERROR') {
        // Update item status to error
        await db
          .update(plaidItems)
          .set({
            status: 'error',
            error: error ? `${error.error_code}: ${error.error_message}` : 'Unknown error',
            updatedAt: new Date(),
          })
          .where(eq(plaidItems.itemId, item_id))
      } else if (webhook_code === 'PENDING_EXPIRATION') {
        // Update item status to pending expiration
        await db
          .update(plaidItems)
          .set({
            status: 'pending_expiration',
            updatedAt: new Date(),
          })
          .where(eq(plaidItems.itemId, item_id))
      }
    }

    return c.json({ success: true })
  } catch (webhookError) {
    console.error(`Webhook processing error: ${webhookError}`)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})
