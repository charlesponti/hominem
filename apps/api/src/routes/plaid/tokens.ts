import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { plaidClient, PLAID_COUNTRY_CODES, PLAID_PRODUCTS, PLAID_REDIRECT_URI, PLAID_WEBHOOK_URL } from '../../services/plaid'

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
        // Get the user from the session
        const { user } = request.session

        if (!user) {
          return reply.status(401).send({ error: 'User not authenticated' })
        }

        // Create the link token
        const tokenResponse = await plaidClient.linkTokenCreate({
          user: { client_user_id: user.id },
          client_name: 'Hominem Finance',
          products: PLAID_PRODUCTS,
          country_codes: PLAID_COUNTRY_CODES,
          language: 'en',
          webhook: PLAID_WEBHOOK_URL,
          redirect_uri: PLAID_REDIRECT_URI,
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
        const { user } = request.session
        const { publicToken } = request.body as z.infer<typeof exchangeTokenSchema>

        if (!user) {
          return reply.status(401).send({ error: 'User not authenticated' })
        }

        // Exchange the public token for an access token
        const exchangeResponse = await plaidClient.itemPublicTokenExchange({
          public_token: publicToken,
        })

        const { access_token, item_id } = exchangeResponse.data

        // Store the access token and item ID in your database
        await fastify.db.plaidConnections.create({
          data: {
            userId: user.id,
            itemId: item_id,
            accessToken: access_token,
            status: 'active',
          },
        })

        // Get institution information
        await updateInstitutionInfo(item_id, access_token)
        
        // Fetch and store account information
        await fetchAndStoreAccounts(access_token, item_id, user.id)

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
      
      // Store institution information
      await fastify.db.plaidInstitutions.upsert({
        where: { institutionId },
        create: {
          institutionId,
          name: institution.name,
          logo: institution.logo,
          primaryColor: institution.primary_color,
          url: institution.url,
        },
        update: {
          name: institution.name,
          logo: institution.logo,
          primaryColor: institution.primary_color,
          url: institution.url,
        },
      })
      
      // Update plaidConnection with institution information
      await fastify.db.plaidConnections.update({
        where: { itemId },
        data: {
          institutionId,
          institutionName: institution.name,
        },
      })
    } catch (error) {
      fastify.log.error(`Error updating institution info: ${error}`)
    }
  }

  /**
   * Fetch and store account information
   */
  async function fetchAndStoreAccounts(accessToken: string, itemId: string, userId: string) {
    try {
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      })
      
      const accounts = accountsResponse.data.accounts
      
      // Store each account
      for (const account of accounts) {
        await fastify.db.plaidAccounts.create({
          data: {
            accountId: account.account_id,
            itemId,
            userId,
            name: account.name,
            officialName: account.official_name,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            balanceAvailable: account.balances.available,
            balanceCurrent: account.balances.current,
            balanceLimit: account.balances.limit,
            isoCurrencyCode: account.balances.iso_currency_code,
          },
        })
      }
    } catch (error) {
      fastify.log.error(`Error fetching and storing accounts: ${error}`)
    }
  }
}