import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { applicationRoutes } from './routes/applications'
import { healthRoutes } from './routes/health'
import { companyRoutes } from './routes/company'
import { jobApplicationRoutes } from './routes/job-applications'
import { surveyRoutes } from './routes/surveys'
import { notesRoutes } from './routes/notes'

export async function createApp() {
  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  })

  // Register plugins
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
  })
  await app.register(helmet)

  // Register routes
  app.register(applicationRoutes, { prefix: '/api/applications' })
  app.register(healthRoutes, { prefix: '/api/health' })
  app.register(companyRoutes, { prefix: '/api/companies' })
  app.register(jobApplicationRoutes, { prefix: '/api/job-applications' })
  app.register(surveyRoutes, { prefix: '/api/surveys' })
  app.register(notesRoutes, { prefix: '/api/notes' })

  // Health check route
  app.get('/healthz', async () => {
    return { status: 'ok' }
  })

  return app
}