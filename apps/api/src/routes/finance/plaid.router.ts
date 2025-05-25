import { QUEUE_NAMES } from '@hominem/utils/consts'
import { db } from '@hominem/utils/db'
import { financialInstitutions, plaidItems } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
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
