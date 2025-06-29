import { db } from '@hominem/utils/db'
import { account } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { isTokenExpired } from '../../lib/twitter-tokens.js'

export const oauthTwitterDebugRoutes = new Hono()

// Debug endpoint to check token scopes
oauthTwitterDebugRoutes.get('/', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    const userAccount = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.provider, 'twitter')))
      .limit(1)

    if (userAccount.length === 0) {
      return c.json({ error: 'No Twitter account connected' }, 404)
    }

    const twitterAccount = userAccount[0]

    return c.json({
      hasAccessToken: !!twitterAccount.accessToken,
      hasRefreshToken: !!twitterAccount.refreshToken,
      scopes: twitterAccount.scope,
      expiresAt: twitterAccount.expiresAt,
      isExpired: isTokenExpired(twitterAccount.expiresAt),
    })
  } catch (error) {
    console.error('Failed to check Twitter account:', error)
    return c.json({ error: 'Failed to check Twitter account' }, 500)
  }
})
