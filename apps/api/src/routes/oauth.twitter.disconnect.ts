import { db } from '@hominem/utils/db'
import { account } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { TwitterDisconnectSchema } from './oauth.twitter.utils.js'

export const oauthTwitterDisconnectRoutes = new Hono()

// Disconnect Twitter account
oauthTwitterDisconnectRoutes.post(
  '/',
  requireAuth,
  zValidator('json', TwitterDisconnectSchema),
  async (c) => {
    const userId = c.get('userId')
    const { accountId } = c.req.valid('json')

    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    try {
      // Verify account belongs to user
      const userAccount = await db
        .select()
        .from(account)
        .where(
          and(
            eq(account.id, accountId),
            eq(account.userId, userId),
            eq(account.provider, 'twitter')
          )
        )
        .limit(1)

      if (userAccount.length === 0) {
        return c.json({ error: 'Account not found' }, 404)
      }

      // Delete the account
      await db.delete(account).where(eq(account.id, accountId))

      console.log(`Disconnected Twitter account ${accountId} for user ${userId}`)
      return c.json({
        success: true,
        message: 'Twitter account disconnected',
      })
    } catch (error) {
      console.error('Failed to disconnect Twitter account:', error)
      return c.json({ error: 'Failed to disconnect account' }, 500)
    }
  }
)
