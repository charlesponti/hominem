import { QUEUE_NAMES } from '@hominem/utils/consts'
import { db } from '@hominem/utils/db'
import { financialInstitutions, plaidItems } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { plaidClient } from '../../../lib/plaid.js'
import { requireAuth } from '../../../middleware/auth.js'

const exchangeTokenSchema = z.object({
  publicToken: z.string().min(1, 'Public token is required'),
  institutionId: z.string().min(1, 'Institution ID is required'),
  institutionName: z.string().min(1, 'Institution name is required'),
})

export const financePlaidExchangeTokenRoutes = new Hono()

// Exchange public token for access token and initiate account/transaction import
financePlaidExchangeTokenRoutes.post(
  '/',
  requireAuth,
  zValidator('json', exchangeTokenSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const { publicToken, institutionId, institutionName } = c.req.valid('json')

    try {
      // Exchange public token for access token
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      })

      const accessToken = exchangeResponse.data.access_token
      const itemId = exchangeResponse.data.item_id

      // Check if institution exists, create if not
      const existingInstitution = await db.query.financialInstitutions.findFirst({
        where: eq(financialInstitutions.id, institutionId),
      })

      if (!existingInstitution) {
        // Insert institution
        await db.insert(financialInstitutions).values({
          id: institutionId,
          name: institutionName,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      // Check if plaid item already exists for this user/institution
      const existingItem = await db.query.plaidItems.findFirst({
        where: and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId)),
      })

      if (existingItem) {
        // Update existing item
        await db
          .update(plaidItems)
          .set({
            accessToken,
            status: 'active',
            error: null,
            updatedAt: new Date(),
          })
          .where(eq(plaidItems.id, existingItem.id))

        console.log(
          `Updated existing Plaid item for user ${userId} and institution ${institutionName}`
        )
      } else {
        // Insert new plaid item
        await db.insert(plaidItems).values({
          id: randomUUID(),
          itemId,
          accessToken,
          institutionId,
          status: 'active',
          lastSyncedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId,
        })

        console.log(`Created new Plaid item for user ${userId} and institution ${institutionName}`)
      }

      // Queue sync job
      const queues = c.get('queues')
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
        }
      )

      console.log(`Exchanged public token for user ${userId} and institution ${institutionName}`)
      return c.json({
        success: true,
        message: 'Successfully linked account. Your transactions will begin importing shortly.',
        institutionName,
      })
    } catch (error) {
      console.error(`Token exchange error: ${error}`)
      return c.json({ error: 'Failed to exchange token' }, 500)
    }
  }
)
