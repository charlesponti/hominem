import { QUEUE_NAMES } from '@hominem/utils/consts'
import { db } from '@hominem/utils/db'
import {
  financeAccounts,
  financialInstitutions,
  plaidItems,
  transactions,
} from '@hominem/utils/schema'
import { and, desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { env } from '../../lib/env.js'
import { handleError } from '../../lib/errors.js'
import {
  PLAID_COUNTRY_CODES,
  PLAID_PRODUCTS,
  plaidClient,
  verifyPlaidWebhookSignature,
} from '../../lib/plaid.js'
import { verifyAuth } from '../../middleware/auth.js'
import { rateLimit } from '../../middleware/rate-limit.js'

// Plaid API router for handling Plaid API integration
export async function plaidRoutes(fastify: FastifyInstance) {
  // Create a new link token
  fastify.post(
    '/create-link-token',
    {
      preHandler: [verifyAuth, rateLimit],
    },
    async (request, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ error: 'Not authorized' })
      }

      try {
        const createTokenResponse = await plaidClient.linkTokenCreate({
          user: { client_user_id: userId },
          client_name: 'Hominem Finance',
          products: PLAID_PRODUCTS,
          country_codes: PLAID_COUNTRY_CODES,
          language: 'en',
          webhook: `${env.API_URL}/api/plaid/webhook`,
        })

        fastify.log.info(`Created Plaid link token for user ${userId}`)
        return {
          success: true,
          linkToken: createTokenResponse.data.link_token,
          expiration: createTokenResponse.data.expiration,
        }
      } catch (error) {
        fastify.log.error(`Failed to create Plaid link token: ${error}`)
        return handleError(error as Error, reply)
      }
    }
  )

  // Exchange public token for access token and initiate account/transaction import
  const exchangeTokenSchema = z.object({
    publicToken: z.string().min(1, 'Public token is required'),
    institutionId: z.string().min(1, 'Institution ID is required'),
    institutionName: z.string().min(1, 'Institution name is required'),
  })

  fastify.post(
    '/exchange-token',
    {
      preHandler: [verifyAuth, rateLimit],
    },
    async (request, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ error: 'Not authorized' })
      }

      try {
        const validated = exchangeTokenSchema.safeParse(request.body)
        if (!validated.success) {
          reply.code(400)
          return {
            error: 'Validation failed',
            details: validated.error.issues,
          }
        }

        const { publicToken, institutionId, institutionName } = validated.data

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

          fastify.log.info(
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

          fastify.log.info(
            `Created new Plaid item for user ${userId} and institution ${institutionName}`
          )
        }

        // Queue sync job
        await fastify.queues.plaidSync.add(
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
          }
        )

        fastify.log.info(
          `Exchanged public token for user ${userId} and institution ${institutionName}`
        )
        return {
          success: true,
          message: 'Successfully linked account. Your transactions will begin importing shortly.',
          institutionName,
        }
      } catch (error) {
        fastify.log.error(`Token exchange error: ${error}`)
        return handleError(error as Error, reply)
      }
    }
  )

  // Manually trigger a sync for a Plaid item
  fastify.post(
    '/sync/:itemId',
    {
      preHandler: [verifyAuth, rateLimit],
    },
    async (request, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ error: 'Not authorized' })
      }

      const { itemId } = request.params as { itemId: string }
      if (!itemId) {
        return reply.code(400).send({ error: 'Item ID is required' })
      }

      try {
        // Verify the Plaid item belongs to the user
        const plaidItem = await db.query.plaidItems.findFirst({
          where: and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId)),
        })

        if (!plaidItem) {
          return reply.code(404).send({ error: 'Plaid item not found' })
        }

        // Queue sync job
        await fastify.queues.plaidSync.add(
          QUEUE_NAMES.PLAID_SYNC,
          {
            userId,
            accessToken: plaidItem.accessToken,
            itemId,
            initialSync: false,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          }
        )

        return {
          success: true,
          message: 'Sync job queued successfully',
        }
      } catch (error) {
        fastify.log.error(`Failed to trigger sync: ${error}`)
        return handleError(error as Error, reply)
      }
    }
  )

  // Get connected institutions
  fastify.get(
    '/connections',
    {
      preHandler: [verifyAuth, rateLimit],
    },
    async (request, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ error: 'Not authorized' })
      }

      try {
        // Get all Plaid items for the user with institution info
        const plaidItemsWithInstitutions = await db.query.plaidItems.findMany({
          where: eq(plaidItems.userId, userId),
          with: {
            institution: true,
          },
        })

        return {
          connections: plaidItemsWithInstitutions.map((item) => ({
            id: item.id,
            itemId: item.itemId,
            institutionId: item.institutionId,
            institutionName: item.institution.name,
            status: item.status,
            lastSyncedAt: item.lastSyncedAt,
            error: item.error,
          })),
        }
      } catch (error) {
        fastify.log.error(`Failed to get connections: ${error}`)
        return handleError(error as Error, reply)
      }
    }
  )

  // Get connected accounts for the user
  fastify.get(
    '/accounts',
    {
      preHandler: [verifyAuth, rateLimit],
    },
    async (request, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ error: 'Not authorized' })
      }

      try {
        const accounts = await db
          .select({
            id: financeAccounts.id,
            name: financeAccounts.name,
            type: financeAccounts.type,
            balance: financeAccounts.balance,
            mask: financeAccounts.mask,
            subtype: financeAccounts.subtype,
            institutionId: financeAccounts.institutionId,
            plaidItemId: financeAccounts.plaidItemId,
            institutionName: financialInstitutions.name,
            institutionLogo: financialInstitutions.logo,
          })
          .from(financeAccounts)
          .leftJoin(plaidItems, eq(financeAccounts.plaidItemId, plaidItems.id))
          .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
          .where(eq(financeAccounts.userId, userId))

        return { accounts }
      } catch (error) {
        fastify.log.error(`Error fetching accounts: ${error}`)
        return handleError(error as Error, reply)
      }
    }
  )

  // Get transactions for the user
  fastify.get(
    '/transactions',
    {
      preHandler: [verifyAuth, rateLimit],
    },
    async (request, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ error: 'Not authorized' })
      }

      try {
        const userTransactions = await db
          .select({
            id: transactions.id,
            amount: transactions.amount,
            date: transactions.date,
            description: transactions.description,
            merchantName: transactions.merchantName,
            type: transactions.type,
            pending: transactions.pending,
            category: transactions.category,
            parentCategory: transactions.parentCategory,
            accountName: financeAccounts.name,
            accountMask: financeAccounts.mask,
          })
          .from(transactions)
          .leftJoin(financeAccounts, eq(transactions.accountId, financeAccounts.id))
          .where(eq(transactions.userId, userId))
          .orderBy(desc(transactions.date))

        return { transactions: userTransactions }
      } catch (error) {
        fastify.log.error(`Error fetching transactions: ${error}`)
        return handleError(error as Error, reply)
      }
    }
  )

  // Disconnect a Plaid connection
  fastify.delete(
    '/connections/:itemId',
    {
      preHandler: [verifyAuth, rateLimit],
    },
    async (request, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ error: 'Not authorized' })
      }

      const { itemId } = request.params as { itemId: string }
      if (!itemId) {
        return reply.code(400).send({ error: 'Item ID is required' })
      }

      try {
        // Verify the Plaid item belongs to the user
        const plaidItem = await db.query.plaidItems.findFirst({
          where: and(eq(plaidItems.userId, userId), eq(plaidItems.id, itemId)),
        })

        if (!plaidItem) {
          return reply.code(404).send({ error: 'Plaid item not found' })
        }

        // Remove the item from Plaid
        await plaidClient.itemRemove({
          access_token: plaidItem.accessToken,
        })

        // Delete the item from database
        await db.delete(plaidItems).where(eq(plaidItems.id, itemId))

        // Note: We're not deleting transactions or accounts here to preserve history
        // The accounts will be marked as inactive or potentially flagged as disconnected

        return {
          success: true,
          message: 'Connection removed successfully',
        }
      } catch (error) {
        fastify.log.error(`Failed to remove connection: ${error}`)
        return handleError(error as Error, reply)
      }
    }
  )

  // Sync transactions (webhook handling)
  fastify.post('/webhook', async (request, reply) => {
    try {
      const body = JSON.stringify(request.body)
      const webhookData = request.body as Record<string, unknown>

      // Verify webhook signature
      const isValid = verifyPlaidWebhookSignature(
        request.headers as Record<string, string | string[] | undefined>,
        body
      )

      if (!isValid) {
        fastify.log.warn('Invalid webhook signature')
        return reply.code(401).send({ error: 'Invalid webhook signature' })
      }

      fastify.log.info(`Received Plaid webhook: ${JSON.stringify(webhookData)}`)

      // Handle different webhook types
      const webhookType = webhookData.webhook_type as string
      const webhookCode = webhookData.webhook_code as string
      const itemId = webhookData.item_id as string

      if (!itemId) {
        fastify.log.warn('Webhook missing item_id')
        return reply.code(400).send({ error: 'Missing item_id' })
      }

      // Get Plaid item from database
      const plaidItem = await db.query.plaidItems.findFirst({
        where: eq(plaidItems.itemId, itemId),
      })

      if (!plaidItem) {
        fastify.log.warn(`Webhook for unknown item: ${itemId}`)
        return reply.code(404).send({ error: 'Item not found' })
      }

      const { userId, accessToken } = plaidItem

      switch (webhookType) {
        case 'TRANSACTIONS':
          // Handle transactions webhooks
          switch (webhookCode) {
            case 'INITIAL_UPDATE':
            case 'HISTORICAL_UPDATE':
            case 'DEFAULT_UPDATE':
              // Queue a sync job
              fastify.log.info(`Queueing sync job for item ${itemId} (${webhookCode})`)
              await fastify.queues.plaidSync.add(
                'plaid-sync',
                {
                  userId,
                  accessToken,
                  itemId,
                  initialSync: webhookCode === 'INITIAL_UPDATE',
                },
                {
                  attempts: 3,
                  backoff: {
                    type: 'exponential',
                    delay: 5000,
                  },
                }
              )
              break

            default:
              fastify.log.info(`Unhandled transactions webhook code: ${webhookCode}`)
          }
          break

        case 'ITEM':
          // Handle item webhooks (errors, status changes)
          switch (webhookCode) {
            case 'ERROR': {
              const error = webhookData.error as Record<string, unknown>
              fastify.log.error(`Plaid item error: ${JSON.stringify(error)}`)

              // Update item status in database
              await db
                .update(plaidItems)
                .set({
                  status: 'error',
                  error: (error.display_message as string) || (error.error_message as string),
                  updatedAt: new Date(),
                })
                .where(eq(plaidItems.itemId, itemId))
              break
            }
            case 'PENDING_EXPIRATION':
              fastify.log.warn(`Plaid item pending expiration: ${itemId}`)
              // Update item status
              await db
                .update(plaidItems)
                .set({
                  status: 'pending_expiration',
                  updatedAt: new Date(),
                })
                .where(eq(plaidItems.itemId, itemId))
              break

            case 'USER_PERMISSION_REVOKED':
              fastify.log.warn(`Plaid item permission revoked: ${itemId}`)
              // Update item status
              await db
                .update(plaidItems)
                .set({
                  status: 'revoked',
                  updatedAt: new Date(),
                })
                .where(eq(plaidItems.itemId, itemId))
              break

            default:
              fastify.log.info(`Unhandled item webhook code: ${webhookCode}`)
          }
          break

        default:
          fastify.log.info(`Unhandled webhook type: ${webhookType}`)
      }

      return { received: true }
    } catch (error) {
      fastify.log.error(`Webhook error: ${error}`)
      return handleError(error as Error, reply)
    }
  })
}
