import fs from 'node:fs'
import { z } from 'zod'
import { handleFileUpload } from '../../middleware/file-upload.js'
import { SupabaseVectorService } from '../../services/vector.service.js'
import { protectedProcedure, router } from '../index.js'

export const vectorRouter = router({
  // Upload CSV file to vector store
  uploadCsv: protectedProcedure
    .input(
      z.object({
        indexName: z.string().min(1, 'Index name is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Handle file upload
        const uploadedFile = await handleFileUpload(ctx.req.raw)

        if (!uploadedFile) {
          throw new Error('No file uploaded')
        }

        if (!uploadedFile.mimetype.includes('csv')) {
          // Clean up the temp file
          fs.unlinkSync(uploadedFile.filepath)
          throw new Error('Only CSV files are supported')
        }

        // Read file buffer
        const fileBuffer = fs.readFileSync(uploadedFile.filepath)

        // Process the CSV
        const { recordsProcessed, filePath } = await SupabaseVectorService.uploadCSVToVectorStore(
          fileBuffer,
          uploadedFile.filename || 'upload.csv',
          ctx.userId,
          input.indexName
        )

        // Clean up the temp file
        fs.unlinkSync(uploadedFile.filepath)

        return {
          success: true,
          recordsProcessed,
          filePath,
          message: `${recordsProcessed} records processed and embedded`,
        }
      } catch (error) {
        throw new Error(
          `Failed to process CSV file: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Query vector store
  query: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1, 'Query string is required'),
        indexName: z.string().min(1, 'Index name is required'),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { results } = await SupabaseVectorService.query({
          q: input.query,
          indexName: input.indexName,
          limit: input.limit,
          userId: ctx.userId,
        })

        return {
          results,
          count: results.length || 0,
        }
      } catch (error) {
        throw new Error(
          `Failed to process query: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Ingest markdown text into vector store
  ingestMarkdown: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1, 'Text content is required'),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await SupabaseVectorService.ingestMarkdown(
          input.text,
          ctx.userId,
          input.metadata
        )

        return {
          success: result.success,
          chunksProcessed: result.chunksProcessed,
          message: `${result.chunksProcessed} chunks processed and embedded`,
        }
      } catch (error) {
        throw new Error(
          `Failed to ingest markdown: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Search documents by user
  searchUserDocuments: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1, 'Query string is required'),
        limit: z.number().optional().default(10),
        threshold: z.number().optional().default(0.7),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { results } = await SupabaseVectorService.searchDocumentsByUser(
          input.query,
          ctx.userId,
          input.limit,
          input.threshold
        )

        return {
          results,
          count: results.length || 0,
        }
      } catch (error) {
        throw new Error(
          `Failed to search documents: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Get user documents
  getUserDocuments: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const documents = await SupabaseVectorService.getUserDocuments(
          ctx.userId,
          input.limit,
          input.offset
        )

        return {
          documents,
          count: documents.length,
        }
      } catch (error) {
        throw new Error(
          `Failed to get user documents: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Delete user documents
  deleteUserDocuments: protectedProcedure
    .input(
      z.object({
        source: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await SupabaseVectorService.deleteUserDocuments(ctx.userId, input.source)

        return {
          success: result.success,
          message: 'Documents deleted successfully',
        }
      } catch (error) {
        throw new Error(
          `Failed to delete documents: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Get user files from storage
  getUserFiles: protectedProcedure
    .input(
      z.object({
        indexName: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const files = await SupabaseVectorService.getUserFiles(ctx.userId, input.indexName)

        return {
          files,
          count: files.length,
        }
      } catch (error) {
        throw new Error(
          `Failed to get user files: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),

  // Delete user file from storage
  deleteUserFile: protectedProcedure
    .input(
      z.object({
        filePath: z.string().min(1, 'File path is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await SupabaseVectorService.deleteUserFile(input.filePath)

        return {
          success: result.success,
          message: 'File deleted successfully',
        }
      } catch (error) {
        throw new Error(
          `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),
})
