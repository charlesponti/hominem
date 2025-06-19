import { db } from '@hominem/utils/db'
import { account } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { makeTwitterApiRequest, type TwitterAccount } from '../lib/twitter-tokens.js'
import { requireAuth } from '../middleware/auth.js'

export const oauthTwitterTestRoutes = new Hono()

// Test Twitter API access
oauthTwitterTestRoutes.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    // Find user's Twitter account
    const userAccount = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.provider, 'twitter')))
      .limit(1)

    if (userAccount.length === 0) {
      return c.json({ error: 'No Twitter account connected' }, 404)
    }

    const twitterAccount = userAccount[0] as TwitterAccount

    // Test with a simple user info request
    const testResponse = await makeTwitterApiRequest(
      twitterAccount,
      'https://api.twitter.com/2/users/me',
      {
        method: 'GET',
      }
    )

    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}))
      return c.json(
        {
          error: 'Twitter API test failed',
          status: testResponse.status,
          details: errorData,
          scopes: twitterAccount.scope,
        },
        400
      )
    }

    const userData = await testResponse.json()
    return c.json({
      success: true,
      user: userData,
      scopes: twitterAccount.scope,
    })
  } catch (error) {
    console.error('Failed to test Twitter API:', error)
    return c.json({ error: 'Failed to test Twitter API' }, 500)
  }
})
