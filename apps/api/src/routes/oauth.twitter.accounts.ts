import { db } from '@hominem/utils/db'
import { account } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
export const oauthTwitterAccountsRoutes = new Hono()

// Get connected Twitter accounts
oauthTwitterAccountsRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    const accounts = await db
      .select({
        id: account.id,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        expiresAt: account.expiresAt,
      })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.provider, 'twitter')))

    return c.json({
      success: true,
      accounts,
    })
  } catch (error) {
    console.error('Failed to fetch Twitter accounts:', error)
    return c.json({ error: 'Failed to fetch accounts' }, 500)
  }
})
