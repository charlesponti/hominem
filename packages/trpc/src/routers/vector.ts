import { VectorService } from '@hominem/services/vector'
import { fileStorageService } from '@hominem/utils/supabase'
import { z } from 'zod'
import { handleFileUploadBuffer } from '../middleware/file-upload.js'
import { protectedProcedure, router } from '../procedures'

export const vectorRouter = router({
  // ========================================
  // VECTOR SEARCH OPERATIONS
  // ========================================

  // Search vector store by similarity
  searchVectors: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1, 'Query string is required'),
        source: z.string().min(1, 'Source is required'),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const { results } = await VectorService.query({
          q: input.query,
          source: input.source,
          limit: input.limit,
        })

        return { results, count: results.length || 0 }
      } catch (error) {
        throw new Error(
          `Failed to search vector store: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Search user's vector documents by similarity
  searchUserVectors: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1, 'Query string is required'),
        limit: z.number().optional().default(10),
        threshold: z.number().optional().default(0.7),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { results } = await VectorService.searchDocumentsByUser(
          input.query,
          ctx.userId,
          input.limit,
          input.threshold
        )

        return { results, count: results.length || 0 }
      } catch (error) {
        throw new Error(
          `Failed to search user vectors: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Get user's vector documents
  getUserVectors: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const vectors = await VectorService.getUserDocuments(ctx.userId, input.limit, input.offset)

        return { vectors, count: vectors.length }
      } catch (error) {
        throw new Error(
          `Failed to get user vectors: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Delete user's vector documents
  deleteUserVectors: protectedProcedure
    .input(
      z.object({
        source: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await VectorService.deleteUserDocuments(ctx.userId, input.source)

        return { success: result.success, message: 'Vector documents deleted successfully' }
      } catch (error) {
        throw new Error(
          `Failed to delete user vectors: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // ========================================
  // TEXT INGESTION OPERATIONS
  // ========================================

  // Ingest markdown text into vector store
  ingestText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1, 'Text content is required'),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await VectorService.ingestMarkdown(input.text, ctx.userId, input.metadata)

        return {
          success: result.success,
          chunksProcessed: result.chunksProcessed,
          message: `${result.chunksProcessed} text chunks processed and embedded`,
        }
      } catch (error) {
        throw new Error(
          `Failed to ingest text: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // ========================================
  // FILE UPLOAD & PROCESSING OPERATIONS
  // ========================================

  // Upload and process CSV file into vectors
  uploadCsvToVectors: protectedProcedure
    .input(
      z.object({
        source: z.string().min(1, 'Source is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Handle file upload - get buffer directly
        const uploadedFile = await handleFileUploadBuffer(ctx.req.raw)

        if (!uploadedFile) {
          throw new Error('No file uploaded')
        }

        if (!uploadedFile.mimetype.includes('csv')) {
          throw new Error('Only CSV files are supported')
        }

        // Store file using fileStorageService (no disk I/O needed)
        const storedFile = await fileStorageService.storeFile(
          Buffer.from(uploadedFile.buffer.buffer),
          uploadedFile.mimetype,
          ctx.userId,
          { filename: uploadedFile.filename || 'upload.csv' }
        )

        // Process the CSV for vector embeddings
        const { recordsProcessed } = await VectorService.processCSVToVectorStore(
          uploadedFile.buffer,
          ctx.userId,
          input.source
        )

        return {
          success: true,
          recordsProcessed,
          fileId: storedFile.id,
          fileUrl: storedFile.url,
          message: `${recordsProcessed} CSV records processed into vector embeddings`,
        }
      } catch (error) {
        throw new Error(
          `Failed to process CSV file: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // ========================================
  // FILE STORAGE OPERATIONS
  // ========================================

  // Get user's uploaded files
  getUserFiles: protectedProcedure.query(async ({ ctx }) => {
    try {
      const files = await fileStorageService.listUserFiles(ctx.userId)

      return { files, count: files.length }
    } catch (error) {
      throw new Error(
        `Failed to get user files: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }),

  // Delete user's uploaded file
  deleteUserFile: protectedProcedure
    .input(
      z.object({
        fileId: z.string().min(1, 'File ID is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const success = await fileStorageService.deleteFile(input.fileId, ctx.userId)

        return { success, message: success ? 'File deleted successfully' : 'File not found' }
      } catch (error) {
        throw new Error(
          `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),
})
