import { serve } from '@hono/node-server'
import { trpcServer } from '@hono/trpc-server'
import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { logger as honoLogger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { db } from '../../db'
import { appRouter } from './trpc.server'

async function startServer(options: { port: string; host: string; jwtSecret: string }) {
  const port = Number.parseInt(options.port, 10)
  const host = options.host
  const jwtSecret = options.jwtSecret

  // Create Hono app
  const app = new Hono()

  // Middleware
  app.use('*', honoLogger())
  app.use('*', prettyJSON())
  app.use('*', cors())

  // JWT authentication for protected routes
  app.use(
    '/trpc/*'
    // jwt({
    //   secret: jwtSecret,
    //   cookie: 'auth_token',
    // })
  )

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

  // tRPC endpoint
  app.use(
    '/trpc/*',
    trpcServer({
      router: appRouter,
    })
  )

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: db ? 'connected' : 'disconnected',
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
  logger.info(`Server starting on http://${host}:${port}`)

  serve({
    fetch: app.fetch,
    port,
    hostname: host,
  })

  logger.info(`Server running at http://${host}:${port}`)
  logger.info(`API documentation available at http://${host}:${port}/`)
}

const command = new Command()
  .name('serve')
  .description('Start the API server')
  .option('-p, --port <port>', 'Port to run the server on', '4445')
  .option('-h, --host <host>', 'Host to run the server on', 'localhost')
  .option('--email-domain <domain>', 'Email domain for masked emails', 'myapp.example.com')
  .option(
    '--jwt-secret <secret>',
    'JWT secret for authentication',
    'hominem-cli-development-secret'
  )
  .action((options) => {
    startServer({
      port: options.port || '4445',
      host: options.host || 'localhost',
      jwtSecret: options.jwtSecret || 'hominem-cli-development-secret',
    })
  })

export default command

if (require.main === module) {
  startServer({
    port: '4445',
    host: 'localhost',
    jwtSecret: 'hominem-cli-development-secret',
  })
}
