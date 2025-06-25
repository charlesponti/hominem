import { logger } from '@hominem/utils/logger'
import { Hono } from 'hono'

export const vectorRoutes = new Hono()

// Note: Vector operations are now handled through tRPC at /trpc/vector/*
// This file is kept for backward compatibility but routes are deprecated

vectorRoutes.get('/', (c) => {
  return c.json({
    message: 'Vector operations have been moved to tRPC. Use /trpc/vector/* endpoints instead.',
    endpoints: {
      uploadCsv: 'POST /trpc/vector.uploadCsv',
      query: 'POST /trpc/vector.query',
      ingestMarkdown: 'POST /trpc/vector.ingestMarkdown',
      searchUserDocuments: 'POST /trpc/vector.searchUserDocuments',
      getUserDocuments: 'POST /trpc/vector.getUserDocuments',
      deleteUserDocuments: 'POST /trpc/vector.deleteUserDocuments',
      getUserFiles: 'POST /trpc/vector.getUserFiles',
      deleteUserFile: 'POST /trpc/vector.deleteUserFile',
    },
  })
})

// Legacy endpoints - deprecated
vectorRoutes.post('/upload-csv/:indexName', (c) => {
  logger.warn('Legacy vector endpoint used. Please migrate to tRPC.')
  return c.json(
    {
      error: 'This endpoint is deprecated. Please use POST /trpc/vector.uploadCsv instead.',
      migration: 'Use tRPC client with vector.uploadCsv.mutate()',
    },
    410
  )
})

vectorRoutes.post('/query/:indexName', (c) => {
  logger.warn('Legacy vector endpoint used. Please migrate to tRPC.')
  return c.json(
    {
      error: 'This endpoint is deprecated. Please use POST /trpc/vector.query instead.',
      migration: 'Use tRPC client with vector.query.query()',
    },
    410
  )
})

vectorRoutes.post('/ingest/markdown', (c) => {
  logger.warn('Legacy vector endpoint used. Please migrate to tRPC.')
  return c.json(
    {
      error: 'This endpoint is deprecated. Please use POST /trpc/vector.ingestMarkdown instead.',
      migration: 'Use tRPC client with vector.ingestMarkdown.mutate()',
    },
    410
  )
})
