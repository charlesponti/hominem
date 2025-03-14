import { serve } from '@hono/node-server'
import { trpcServer } from '@hono/trpc-server'
import { logger } from '@ponti/utils/logger'
import { initTRPC } from '@trpc/server'
import { Command } from 'commander'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db'
import { FinanceRouter } from './routers/finance-router'

// Initialize tRPC
const t = initTRPC.create()

// Email Mask Router
class EmailMaskRouter {
  private emailAddresses: {
    id: string
    uuidEmail: string
    userId: string
    isActive: boolean
  }[] = []
  private emailDomain: string

  constructor(emailDomain: string) {
    this.emailDomain = emailDomain
    if (!emailDomain) {
      throw new Error('Email domain must be provided.')
    }
  }

  public router = t.router({
    generateEmail: t.procedure.input(z.object({ userId: z.string() })).mutation(({ input }) => {
      const uuid = randomUUID()
      const newEmail = {
        id: randomUUID(),
        uuidEmail: `${uuid}@${this.emailDomain}`,
        userId: input.userId,
        isActive: true,
      }
      this.emailAddresses.push(newEmail)
      return newEmail
    }),

    deactivateEmail: t.procedure.input(z.object({ id: z.string() })).mutation(({ input }) => {
      const index = this.emailAddresses.findIndex((email) => email.id === input.id)
      if (index === -1) return false
      this.emailAddresses[index].isActive = false
      return true
    }),

    getEmailById: t.procedure.input(z.object({ id: z.string() })).query(({ input }) => {
      return this.emailAddresses.find((email) => email.id === input.id)
    }),

    getEmailsByUserId: t.procedure.input(z.object({ userId: z.string() })).query(({ input }) => {
      return this.emailAddresses.filter((email) => email.userId === input.userId && email.isActive)
    }),
  })
}

// Notes Router
class NotesRouter {
  private notes: {
    id: string
    content: string
    title: string
    createdAt: Date
    updatedAt?: Date
  }[] = []

  public router = t.router({
    create: t.procedure
      .input(z.object({ details: z.object({ content: z.string() }) }))
      .mutation(async ({ input }) => {
        const note = {
          id: randomUUID(),
          content: input.details.content,
          title: input.details.content.split('\n')[0] || 'Untitled',
          createdAt: new Date(),
        }
        this.notes.push(note)
        return note
      }),

    list: t.procedure.query(async () => {
      return this.notes
    }),

    update: t.procedure
      .input(z.object({ id: z.string(), details: z.object({ content: z.string() }) }))
      .mutation(async ({ input }) => {
        const index = this.notes.findIndex((n) => n.id === input.id)
        if (index === -1) throw new Error('Note not found')

        this.notes[index] = {
          ...this.notes[index],
          content: input.details.content,
          title: input.details.content.split('\n')[0] || 'Untitled',
          updatedAt: new Date(),
        }
        return this.notes[index]
      }),

    delete: t.procedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      const index = this.notes.findIndex((n) => n.id === input.id)
      if (index === -1) throw new Error('Note not found')
      this.notes.splice(index, 1)
      return { success: true }
    }),
  })
}

const command = new Command()
  .name('serve')
  .description('Start the API server')
  .option('-p, --port <port>', 'Port to run the server on', '4445')
  .option('-h, --host <host>', 'Host to run the server on', 'localhost')
  .option('--email-domain <domain>', 'Email domain for masked emails', 'myapp.example.com')
  .action(async (options) => {
    const port = Number.parseInt(options.port, 10)
    const host = options.host
    const emailDomain = options.emailDomain

    // Create routers
    const emailRouter = new EmailMaskRouter(emailDomain)
    const notesRouter = new NotesRouter()
    const financeRouter = new FinanceRouter()

    // Merge routers
    const appRouter = t.router({
      email: emailRouter.router,
      notes: notesRouter.router,
      finance: financeRouter.router,
    })

    // Create Hono app
    const app = new Hono()

    // Middleware
    app.use('*', honoLogger())
    app.use('*', prettyJSON())
    app.use('*', cors())

    // Root endpoint
    app.get('/', (c) => {
      return c.json({
        message: 'Hominem API running',
        version: '1.0.0',
        endpoints: ['/trpc', '/health'],
        routes: {
          email: [
            '/trpc/email.generateEmail',
            '/trpc/email.deactivateEmail',
            '/trpc/email.getEmailById',
            '/trpc/email.getEmailsByUserId',
          ],
          notes: [
            '/trpc/notes.create',
            '/trpc/notes.list',
            '/trpc/notes.update',
            '/trpc/notes.delete',
          ],
          finance: [
            '/trpc/finance.getAccounts',
            '/trpc/finance.updateAccount',
            '/trpc/finance.queryTransactions',
            '/trpc/finance.analyzeTransactions',
            '/trpc/finance.getTransactionById',
            '/trpc/finance.getFinanceSummary',
          ],
        },
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

    // Start server
    logger.info(`Server starting on http://${host}:${port}`)

    serve({
      fetch: app.fetch,
      port,
      hostname: host,
    })

    logger.info(`Server running at http://${host}:${port}`)
    logger.info(`API documentation available at http://${host}:${port}/`)
  })

export default command
