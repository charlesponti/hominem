import { logger } from '@hominem/utils/logger'
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { verifyAuth } from '../../middleware/auth'
import googleService from './auth'

// Zod schemas for request validation
const getDataSchema = z.object({
  spreadsheetId: z.string().min(1, 'Spreadsheet ID is required'),
  range: z.string().min(1, 'Range is required'),
  download: z.coerce.boolean().optional(),
  format: z.enum(['json', 'csv']).optional().default('json'),
})

const spreadsheetIdSchema = z.object({
  spreadsheetId: z.string().min(1, 'Spreadsheet ID is required'),
})

// Authentication check middleware
async function checkGoogleAuth(request: FastifyRequest) {
  if (!request.userId) {
    throw new Error('User not authenticated')
  }

  const isAuthenticated = await googleService.isUserAuthenticated(request.userId)
  if (!isAuthenticated) {
    throw new Error('Not authenticated with Google')
  }
}

const googleSheetsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get spreadsheet data
  fastify.get<{
    Querystring: z.infer<typeof getDataSchema>
  }>(
    '/sheets/data',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['spreadsheetId', 'range'],
          properties: {
            spreadsheetId: { type: 'string' },
            range: { type: 'string' },
            download: { type: 'boolean' },
            format: { type: 'string', enum: ['json', 'csv'] },
          },
        },
      },
      preHandler: [verifyAuth, checkGoogleAuth],
    },
    async (request, reply) => {
      try {
        const query = getDataSchema.parse(request.query)
        const userId = request.userId as string

        const data = await googleService.getSpreadsheetData(
          userId,
          query.spreadsheetId,
          query.range
        )

        if (!data) {
          return reply.status(404).send({ error: 'No data found in the spreadsheet' })
        }

        if (query.download) {
          // Default output path if not provided
          const fileName = `sheet-data-${Date.now()}.${query.format}`
          let content = ''

          if (query.format === 'csv') {
            // Convert data to CSV
            content = data.map((row) => row.join(',')).join('\n')
          } else {
            // Default to JSON
            content = JSON.stringify(data, null, 2)
          }

          // For API routes, we send the file directly to the client
          reply.header('Content-Disposition', `attachment; filename="${fileName}"`)
          reply.type(query.format === 'csv' ? 'text/csv' : 'application/json')
          return reply.send(content)
        }

        return reply.send({ data })
      } catch (error) {
        logger.error('Error fetching spreadsheet data:', error)
        return reply.status(500).send({
          error: 'Failed to fetch spreadsheet data',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  )

  // List sheets in a spreadsheet
  fastify.get<{
    Querystring: z.infer<typeof spreadsheetIdSchema>
  }>(
    '/sheets/list',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['spreadsheetId'],
          properties: {
            spreadsheetId: { type: 'string' },
          },
        },
      },
      preHandler: [verifyAuth, checkGoogleAuth],
    },
    async (request, reply) => {
      try {
        const { spreadsheetId } = spreadsheetIdSchema.parse(request.query)
        const userId = request.userId as string

        const sheets = await googleService.listSpreadsheetSheets(userId, spreadsheetId)

        if (!sheets || sheets.length === 0) {
          return reply.status(404).send({ error: 'No sheets found in the spreadsheet' })
        }

        return reply.send({ sheets })
      } catch (error) {
        logger.error('Error listing sheets:', error)
        return reply.status(500).send({
          error: 'Failed to list spreadsheet sheets',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  )

  // List all spreadsheets
  fastify.get(
    '/sheets/spreadsheets',
    {
      preHandler: [verifyAuth, checkGoogleAuth],
    },
    async (request, reply) => {
      try {
        const userId = request.userId as string
        const spreadsheets = await googleService.listAllSpreadsheets(userId)

        if (!spreadsheets || spreadsheets.length === 0) {
          return reply.status(404).send({ error: 'No spreadsheets found' })
        }

        return reply.send({ spreadsheets })
      } catch (error) {
        logger.error('Error listing spreadsheets:', error)
        return reply.status(500).send({
          error: 'Failed to list spreadsheets',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  )
}

export default googleSheetsPlugin
