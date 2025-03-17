import { logger } from '@ponti/utils/logger'
import type { FastifyPluginAsync } from 'fastify'
import fs from 'node:fs'
import z from 'zod'
import { HominemVectorStore } from '../lib/chromadb'
import { handleFileUpload } from '../middleware/file-upload'
import { CSVProcessor } from '../utils/csv-processor'

const csvProcessor = new CSVProcessor()

export const vectorRoutes: FastifyPluginAsync = async (fastify) => {
  const UploadSchema = {
    params: z.object({
      indexName: z.string(),
    }),
  }
  fastify.post('/upload-csv/:indexName', async (request, reply) => {
    try {
      const indexNameResult = UploadSchema.params.safeParse(request.params)

      if (!indexNameResult.success) {
        return reply.code(400).send({ error: 'Invalid index name parameters' })
      }
      const { indexName } = indexNameResult.data
      const uploadedFile = await handleFileUpload(request)

      if (!uploadedFile) {
        return reply.code(400).send({ error: 'No file uploaded' })
      }

      if (!uploadedFile.mimetype.includes('csv')) {
        // Clean up the temp file
        fs.unlinkSync(uploadedFile.filepath)
        return reply.code(400).send({ error: 'Only CSV files are supported' })
      }

      // Process the CSV
      const recordsProcessed = await csvProcessor.processCSV(uploadedFile.filepath, indexName)

      // Clean up the temp file
      fs.unlinkSync(uploadedFile.filepath)

      return reply.code(201).send({
        success: true,
        recordsProcessed,
        message: `${recordsProcessed} records processed and embedded`,
      })
    } catch (error) {
      logger.error('CSV upload error:', error)
      return reply.code(500).send({ error: 'Failed to process CSV file' })
    }
  })

  const VectorQuerySchema = {
    params: z.object({
      indexName: z.string(),
    }),
    body: z.object({
      query: z.string(),
      limit: z.number().optional(),
    }),
  }
  fastify.post('/query/:indexName', async (request, reply) => {
    try {
      const indexNameResult = VectorQuerySchema.params.safeParse(request.params)

      if (!indexNameResult.success) {
        return reply.code(400).send({ error: 'Invalid index name parameters' })
      }

      const { query, limit = 10 } = VectorQuerySchema.body.parse(request.body)

      if (!query) {
        return reply.code(400).send({ error: 'Query string is required' })
      }

      const { results } = await HominemVectorStore.query({
        q: query,
        indexName: indexNameResult.data.indexName,
        limit,
      })

      return reply.send({
        results,
        count: results.length || 0,
      })
    } catch (error) {
      logger.error('Vector query error:', error)
      return reply.code(500).send({ error: 'Failed to process query' })
    }
  })
}
