import { randomUUID } from 'node:crypto'
import { db } from '@hominem/data'
import { financialInstitutions, plaidItems } from '@hominem/data/schema'
import { QUEUE_NAMES } from '@hominem/utils/consts'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { env } from '../../../lib/env.js'
import { PLAID_COUNTRY_CODES, PLAID_PRODUCTS, plaidClient } from '../../../lib/plaid.js'
import { protectedProcedure, router } from '../../procedures.js'

export const plaidRouter = router({
  // Create a new Plaid link token
  createLinkToken: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const createTokenResponse = await plaidClient.linkTokenCreate({
        user: { client_user_id: ctx.userId },
        client_name: 'Hominem Finance',
        products: PLAID_PRODUCTS,
        country_codes: PLAID_COUNTRY_CODES,
        language: 'en',
        webhook: `${env.API_URL}/api/finance/plaid/webhook`,
      })

      return {
        success: true,
        linkToken: createTokenResponse.data.link_token,
        expiration: createTokenResponse.data.expiration,
      }
    } catch (error) {
      console.error(`Failed to create Plaid link token: ${error}`)
      throw new Error('Failed to create link token')
    }
  }),

  // Exchange public token for access token and initiate account/transaction import
  exchangeToken: protectedProcedure
    .input(
      z.object({
        publicToken: z.string().min(1, 'Public token is required'),
        institutionId: z.string().min(1, 'Institution ID is required'),
        institutionName: z.string().min(1, 'Institution name is required'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { publicToken, institutionId, institutionName } = input

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
          where: and(eq(plaidItems.userId, ctx.userId), eq(plaidItems.itemId, itemId)),
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
            userId: ctx.userId,
          })
        }

        // Queue sync job
        const queues = ctx.queues
        await queues.plaidSync.add(
          QUEUE_NAMES.PLAID_SYNC,
          {
            userId: ctx.userId,
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

        return {
          success: true,
          message: 'Successfully linked account. Your transactions will begin importing shortly.',
          institutionName,
        }
      } catch (error) {
        console.error(`Token exchange error: ${error}`)
        throw new Error('Failed to exchange token')
      }
    }),

  // Sync a Plaid item
  syncItem: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { itemId } = input

      try {
        // Get the plaid item
        const plaidItem = await db.query.plaidItems.findFirst({
          where: and(eq(plaidItems.id, itemId), eq(plaidItems.userId, ctx.userId)),
        })

        if (!plaidItem) {
          throw new Error('Plaid item not found')
        }

        // Queue sync job
        const queues = ctx.queues
        await queues.plaidSync.add(
          QUEUE_NAMES.PLAID_SYNC,
          {
            userId: ctx.userId,
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
          }
        )

        return {
          success: true,
          message: 'Sync job queued successfully',
        }
      } catch (error) {
        console.error(`Sync error: ${error}`)
        throw new Error('Failed to sync item')
      }
    }),

  // Remove a Plaid connection
  removeConnection: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { itemId } = input

      try {
        // Get the plaid item
        const plaidItem = await db.query.plaidItems.findFirst({
          where: and(eq(plaidItems.id, itemId), eq(plaidItems.userId, ctx.userId)),
        })

        if (!plaidItem) {
          throw new Error('Plaid item not found')
        }

        // Revoke access token with Plaid
        try {
          await plaidClient.itemAccessTokenInvalidate({
            access_token: plaidItem.accessToken,
          })
        } catch (error) {
          console.warn('Failed to revoke Plaid access token:', error)
          // Continue with removal even if Plaid revocation fails
        }

        // Delete the plaid item
        await db.delete(plaidItems).where(eq(plaidItems.id, itemId))

        return {
          success: true,
          message: 'Successfully removed Plaid connection',
        }
      } catch (error) {
        console.error(`Remove connection error: ${error}`)
        throw new Error('Failed to remove connection')
      }
    }),
})
