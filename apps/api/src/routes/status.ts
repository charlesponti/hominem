import { db } from '@hominem/utils/db'
import { health } from '@hominem/utils/schema'
import { Hono } from 'hono'

export const statusRoutes = new Hono()

// System health check endpoint
statusRoutes.get('/', async (c) => {
  try {
    // Test database connection
    await db.select().from(health).limit(1)

    return c.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return c.json(
      {
        status: 'error',
        serverTime: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// Legacy /health endpoint for backward compatibility
statusRoutes.get('/health', async (c) => {
  return c.json({ status: 'ok', serverTime: new Date().toISOString() })
})
