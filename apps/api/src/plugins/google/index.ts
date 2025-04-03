import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import googleService from './auth'
import calendarPlugin from './calendar'
import googleSheetsPlugin from './sheets'

const googlePlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Register Google service routes
  googleService.registerRoutes(fastify)

  // Register Google Calendar plugin
  await fastify.register(calendarPlugin)

  // Register Google Sheets plugin
  await fastify.register(googleSheetsPlugin)
}

export default googlePlugin
