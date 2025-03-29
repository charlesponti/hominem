import { serve } from '@hono/node-server'
import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

type AppVariables = {
  jwtPayload: unknown
}

async function startServer(options: { port: string; host: string }) {
  const port = Number.parseInt(options.port, 10)
  const host = options.host

  // Create Hono app
  const app = new Hono<{ Variables: AppVariables }>()

  // Middleware
  app.use('*', honoLogger())
  app.use('*', prettyJSON())
  app.use('*', cors())

  // Root endpoint
  app.get('/', (c) => {
    return c.json({
      message: 'Hominem API running',
      version: '1.0.0',
    })
  })

  // Error handling
  app.onError((err, c) => {
    logger.error('API Error:', err)
    return c.json(
      {
        error: err.message || 'An unknown error occurred',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      500
    )
  })

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  })

  // Auth verification endpoint (used to validate tokens)
  app.get('/auth/verify', async (c) => {
    try {
      // JWT middleware has already verified the token at this point
      const payload = c.get('jwtPayload')

      return c.json({
        authenticated: true,
        user: payload,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Auth verification error:', error)
      return c.json(
        {
          authenticated: false,
          error: 'Invalid authentication token',
        },
        401
      )
    }
  })

  // Start server
  serve({
    fetch: app.fetch,
    port,
    hostname: host,
  })

  logger.info(`Server running at http://${host}:${port}`)
  logger.info(`API documentation available at http://${host}:${port}/`)
  return { app }
}

const command = new Command()
  .name('serve')
  .description('Start the API server')
  .option('-p, --port <port>', 'Port to run the server on', '4445')
  .option('-h, --host <host>', 'Host to run the server on', 'localhost')
  .action((options) => {
    startServer({
      port: options.port || '4445',
      host: options.host || 'localhost',
    })
  })

export default command

if (require.main === module) {
  startServer({
    port: '4445',
    host: 'localhost',
  })
}
