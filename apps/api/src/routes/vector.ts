import { logger } from '@hominem/utils/logger'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import fs from 'node:fs'
import { z } from 'zod'
import { handleFileUpload } from '../middleware/file-upload.js'
import { HominemVectorStore } from '../services/vector.service.js'

export const vectorRoutes = new Hono()

const indexNameParamSchema = z.object({
  indexName: z.string().min(1, 'Index name is required'),
})

const vectorQuerySchema = z.object({
  query: z.string().min(1, 'Query string is required'),
  limit: z.number().optional().default(10),
})

const markdownIngestSchema = z.object({
  text: z.string().min(1, 'Text content is required'),
})

// Upload CSV to vector store
vectorRoutes.post(
  '/upload-csv/:indexName',
  zValidator('param', indexNameParamSchema),
  async (c) => {
    try {
      const { indexName } = c.req.valid('param')

      // Handle file upload using the existing middleware
      const uploadedFile = await handleFileUpload(c.req.raw)

      if (!uploadedFile) {
        return c.json({ error: 'No file uploaded' }, 400)
      }

      if (!uploadedFile.mimetype.includes('csv')) {
        // Clean up the temp file
        fs.unlinkSync(uploadedFile.filepath)
        return c.json({ error: 'Only CSV files are supported' }, 400)
      }

      // Process the CSV
      const recordsProcessed = await HominemVectorStore.uploadCSVToVectorStore(
        uploadedFile.filepath,
        indexName
      )

      // Clean up the temp file
      fs.unlinkSync(uploadedFile.filepath)

      return c.json(
        {
          success: true,
          recordsProcessed,
          message: `${recordsProcessed} records processed and embedded`,
        },
        201
      )
    } catch (error) {
      logger.error('CSV upload error:', error)
      return c.json(
        {
          error: 'Failed to process CSV file',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Query vector store
vectorRoutes.post(
  '/query/:indexName',
  zValidator('param', indexNameParamSchema),
  zValidator('json', vectorQuerySchema),
  async (c) => {
    try {
      const { indexName } = c.req.valid('param')
      const { query, limit } = c.req.valid('json')

      const { results } = await HominemVectorStore.query({
        q: query,
        indexName,
        limit,
      })

      return c.json({
        results,
        count: results.length || 0,
      })
    } catch (error) {
      logger.error('Vector query error:', error)
      return c.json(
        {
          error: 'Failed to process query',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Ingest markdown text into vector store
vectorRoutes.post('/ingest/markdown', zValidator('json', markdownIngestSchema), async (c) => {
  try {
    const { text } = c.req.valid('json')

    const splitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
      chunkSize: 256,
      chunkOverlap: 20,
    })

    const splitDocuments = await splitter.createDocuments([text])

    // Upload documents to vector store
    await HominemVectorStore.upsertBatch(
      'notes',
      splitDocuments.map((doc) => ({
        id: crypto.randomUUID(),
        document: doc.pageContent,
        metadata: doc.metadata,
      }))
    )

    return c.json({ message: 'Markdown ingested successfully' })
  } catch (error) {
    console.error('Markdown ingestion error:', error)
    return c.json(
      {
        error: 'Failed to ingest markdown',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
