import { fileStorageService } from '@hominem/utils/supabase'
import { z } from 'zod'
import { protectedProcedure, router } from '../procedures.js'

export const filesRouter = router({
  // Get file by ID
  fetch: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { fileId } = input
      const userId = ctx.userId

      if (!fileId) {
        throw new Error('File ID required')
      }

      if (!userId) {
        throw new Error('User ID required')
      }

      try {
        const fileData = await fileStorageService.getFile(fileId, userId)

        if (!fileData) {
          throw new Error('File not found')
        }

        return {
          data: fileData,
          contentType: 'application/octet-stream',
          message: 'File fetched successfully',
        }
      } catch (error) {
        console.error('Error serving file:', error)
        throw new Error('Failed to get file')
      }
    }),

  // Get file URL (for direct access)
  getUrl: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { fileId } = input
      const userId = ctx.userId

      if (!fileId) {
        throw new Error('File ID required')
      }

      if (!userId) {
        throw new Error('User ID required')
      }

      try {
        const url = await fileStorageService.getFileUrl(fileId, userId)

        if (!url) {
          throw new Error('File not found')
        }

        return {
          url,
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
          message: 'URL generated successfully',
        }
      } catch (error) {
        console.error('Error generating file URL:', error)
        throw new Error('Failed to generate file URL')
      }
    }),

  // Delete file
  remove: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { fileId } = input
      const userId = ctx.userId

      if (!fileId) {
        throw new Error('File ID required')
      }

      if (!userId) {
        throw new Error('User ID required')
      }

      try {
        const success = await fileStorageService.deleteFile(fileId, userId)

        if (!success) {
          throw new Error('File not found or could not be deleted')
        }

        return { success: true, message: 'File deleted successfully' }
      } catch (error) {
        console.error('Error deleting file:', error)
        throw new Error('Failed to delete file')
      }
    }),

  // List user files
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId

    if (!userId) {
      throw new Error('User ID required')
    }

    try {
      const files = await fileStorageService.listUserFiles(userId)
      return { files, count: files.length }
    } catch (error) {
      console.error('Error listing files:', error)
      throw new Error('Failed to list files')
    }
  }),
})
