import { Hono } from 'hono'
import { env } from '../../../lib/env.js'
import { PLAID_COUNTRY_CODES, PLAID_PRODUCTS, plaidClient } from '../../../lib/plaid.js'
import { requireAuth } from '../../../middleware/auth.js'

export const financePlaidCreateLinkTokenRoutes = new Hono()

// Create a new Plaid link token
financePlaidCreateLinkTokenRoutes.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    const createTokenResponse = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Hominem Finance',
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
      webhook: `${env.API_URL}/api/finance/plaid/webhook`,
    })

    return c.json({
      success: true,
      linkToken: createTokenResponse.data.link_token,
      expiration: createTokenResponse.data.expiration,
    })
  } catch (error) {
    console.error(`Failed to create Plaid link token: ${error}`)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})
