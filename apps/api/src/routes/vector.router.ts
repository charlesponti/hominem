import { logger } from '@ponti/utils/logger'
import type { FastifyPluginAsync } from 'fastify'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import fs from 'node:fs'
import { handleFileUpload } from 'src/middleware/file-upload'
import { HominemVectorStore } from 'src/services/vector.service'
import z from 'zod'

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
      const recordsProcessed = await HominemVectorStore.uploadCSVToVectorStore(
        uploadedFile.filepath,
        indexName
      )

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

  /**
   * This handler takes input text, splits it into chunks, and embeds those chunks
   * into a vector store for later retrieval. See the following docs for more information:
   *
   * https://js.langchain.com/docs/modules/data_connection/document_transformers/text_splitters/recursive_text_splitter
   */
  fastify.post('/ingest/markdown', async (request, reply) => {
    const { text } = request.body as { text: string }

    try {
      const splitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
        chunkSize: 256,
        chunkOverlap: 20,
      })

      const splitDocuments = await splitter.createDocuments([text])

      // 👇 Upload documents to vector store
      await HominemVectorStore.upsertBatch(
        'notes',
        splitDocuments.map((doc) => ({
          id: crypto.randomUUID(),
          document: doc.pageContent,
          metadata: doc.metadata,
        }))
      )

      return reply.send({ message: 'Markdown ingested successfully' })
    } catch (e) {
      console.error(e)
      return reply.code(500).send({ error: 'Failed to ingest markdown' })
    }
  })
}
