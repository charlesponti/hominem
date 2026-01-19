import {
  createBookmarkForUser,
  deleteBookmarkForUser,
  listBookmarksByUser,
  updateBookmarkForUser,
} from '@hominem/services'
import { z } from 'zod'
import { convertOGContentToBookmark, getOpenGraphData } from '../lib/bookmarks.utils.js'
import { protectedProcedure, router } from '../procedures'

export const bookmarksRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return listBookmarksByUser(ctx.userId)
  }),

  create: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { url } = input

      try {
        let converted: {
          url: string
          title: string
          description: string
          image: string
          siteName: string
          imageWidth: string
          imageHeight: string
        }
        try {
          const ogContent = await getOpenGraphData({ url })
          converted = convertOGContentToBookmark({
            url,
            ogContent,
          })
        } catch (ogError) {
          // Fallback to basic URL data if OpenGraph fails
          console.warn('OpenGraph fetch failed, using fallback data:', ogError)
          converted = {
            url,
            title: new URL(url).hostname,
            description: '',
            image: '',
            siteName: new URL(url).hostname,
            imageWidth: '',
            imageHeight: '',
          }
        }

        return await createBookmarkForUser(ctx.userId, converted)
      } catch (error) {
        console.error('Error creating bookmark:', error)
        throw new Error('Failed to create bookmark')
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        url: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, url } = input

      try {
        let converted: {
          url: string
          title: string
          description: string
          image: string
          siteName: string
          imageWidth: string
          imageHeight: string
        }
        try {
          const ogContent = await getOpenGraphData({ url })
          converted = convertOGContentToBookmark({
            url,
            ogContent,
          })
        } catch (ogError) {
          // Fallback to basic URL data if OpenGraph fails
          console.warn('OpenGraph fetch failed, using fallback data:', ogError)
          converted = {
            url,
            title: new URL(url).hostname,
            description: '',
            image: '',
            siteName: new URL(url).hostname,
            imageWidth: '',
            imageHeight: '',
          }
        }

        const updatedBookmark = await updateBookmarkForUser(id, ctx.userId, converted)

        if (!updatedBookmark) {
          throw new Error('Bookmark not found or not owned by user')
        }

        return updatedBookmark
      } catch (error) {
        console.error('Error updating bookmark:', error)
        throw new Error('Failed to update bookmark')
      }
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input

      const deleted = await deleteBookmarkForUser(id, ctx.userId)
      return { success: deleted }
    }),
})
