import { db } from '@hominem/utils/db'
import { financeAccounts, financialInstitutions, plaidItems } from '@hominem/utils/schema'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import {
  PLAID_COUNTRY_CODES,
  PLAID_PRODUCTS,
  PLAID_REDIRECT_URI,
  PLAID_WEBHOOK_URL,
  plaidClient,
} from '../../services/plaid.js'

// Schema for validating the exchange public token request
const exchangeTokenSchema = z.object({
  publicToken: z.string(),
})

/**
 * Register Plaid token-related routes
 */
export default async function plaidTokenRoutes(fastify: FastifyInstance) {
  /**
   * Generate a link token for initializing Plaid Link
   */
  fastify.post('/link-token', {
    schema: {
      response: {
        200: z.object({
          expiration: z.string(),
          link_token: z.string(),
          request_id: z.string(),
        }),
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId } = request

        if (!userId) {
          return reply.status(401).send({ error: 'User not authenticated' })
        }

        // Create the link token
        const tokenResponse = await plaidClient.linkTokenCreate({
          user: { client_user_id: userId },
          client_name: 'Hominem Finance',
          products: PLAID_PRODUCTS,
          country_codes: PLAID_COUNTRY_CODES,
          language: 'en',
          webhook: PLAID_WEBHOOK_URL,
          redirect_uri: PLAID_REDIRECT_URI || undefined,
        })

        return tokenResponse.data
      } catch (error) {
        fastify.log.error(`Error generating link token: ${error}`)
        return reply.status(500).send({ error: 'Failed to generate link token' })
      }
    },
  })

  /**
   * Exchange a public token for an access token and store the connection
   */
  fastify.post('/exchange-token', {
    schema: {
      body: exchangeTokenSchema,
      response: {
        200: z.object({
          status: z.string(),
          itemId: z.string(),
        }),
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId } = request
        const { publicToken } = request.body as z.infer<typeof exchangeTokenSchema>

        if (!userId) {
          return reply.status(401).send({ error: 'User not authenticated' })
        }

        // Exchange the public token for an access token
        const exchangeResponse = await plaidClient.itemPublicTokenExchange({
          public_token: publicToken,
        })

        const { access_token, item_id } = exchangeResponse.data

        // Store the access token and item ID using our schema
        const newPlaidItem = await db
          .insert(plaidItems)
          .values({
            itemId: item_id,
            accessToken: access_token,
            status: 'active',
            userId,
            institutionId: 'unknown', // Will be updated in updateInstitutionInfo
          })
          .returning({ id: plaidItems.id })

        // Get institution information
        await updateInstitutionInfo(item_id, access_token)

        // Fetch and store account information
        await fetchAndStoreAccounts(access_token, item_id, newPlaidItem[0].id, userId)

        return { status: 'success', itemId: item_id }
      } catch (error) {
        fastify.log.error(`Error exchanging public token: ${error}`)
        return reply.status(500).send({ error: 'Failed to exchange public token' })
      }
    },
  })

  /**
   * Get institution information and store it
   */
  async function updateInstitutionInfo(itemId: string, accessToken: string) {
    try {
      // Get the item information
      const itemResponse = await plaidClient.itemGet({
        access_token: accessToken,
      })

      const institutionId = itemResponse.data.item.institution_id

      if (!institutionId) {
        return
      }

      // Get institution details
      const institutionResponse = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: PLAID_COUNTRY_CODES,
      })

      const institution = institutionResponse.data.institution

      // Check if institution already exists
      const existingInstitution = await db.query.financialInstitutions.findFirst({
        where: (institutions, { eq }) => eq(institutions.id, institutionId),
      })

      if (!existingInstitution) {
        // Create new institution record
        await db.insert(financialInstitutions).values({
          id: institutionId,
          name: institution.name,
          logo: institution.logo || null,
          primaryColor: institution.primary_color || null,
          url: institution.url || null,
          country: PLAID_COUNTRY_CODES[0],
        })
      }

      // Update plaidItem with institution information
      await db
        .update(plaidItems)
        .set({
          institutionId,
        })
        .where(eq(plaidItems.itemId, itemId))
    } catch (error) {
      fastify.log.error(`Error updating institution info: ${error}`)
    }
  }

  /**
   * Fetch and store account information
   */
  async function fetchAndStoreAccounts(
    accessToken: string,
    itemId: string,
    plaidItemUuid: string,
    userId: string
  ) {
    try {
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      })

      const accounts = accountsResponse.data.accounts

      // Store each account
      for (const account of accounts) {
        // Create new account using our finance schema
        await db.insert(financeAccounts).values({
          // userId,
          // name: account.name,
          // officialName: account.official_name || null,
          type: mapAccountType(account.type),
          subtype: account.subtype || null,
          balance: (account.balances.current || 0).toFixed(2),
          interestRate: null,
          minimumPayment: null,
          plaidAccountId: account.account_id,
          plaidItemId: plaidItemUuid,
          mask: account.mask || null,
          isoCurrencyCode: account.balances.iso_currency_code || 'USD',
          limit: account.balances.limit || null,
        })
      }
    } catch (error) {
      fastify.log.error(`Error fetching and storing accounts: ${error}`)
    }
  }

  /**
   * Map Plaid account type to our schema's account type
   */
  function mapAccountType(plaidType: string): string {
    const typeMap: Record<string, string> = {
      depository: 'depository',
      credit: 'credit',
      loan: 'loan',
      investment: 'investment',
      other: 'other',
    }

    return typeMap[plaidType] || 'other'
  }
}
