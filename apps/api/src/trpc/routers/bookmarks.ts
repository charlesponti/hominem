import { db } from '@hominem/utils/db'
import { bookmark } from '@hominem/utils/schema'
import { and, desc, eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import { z } from 'zod'
import { convertOGContentToBookmark, getOpenGraphData } from '../../lib/bookmarks.utils.js'
import { protectedProcedure, router } from '../index'

export const bookmarksRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const bookmarks = await db
      .select()
      .from(bookmark)
      .where(eq(bookmark.userId, ctx.userId))
      .orderBy(desc(bookmark.createdAt))

    return bookmarks
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

        const [newBookmark] = await db
          .insert(bookmark)
          .values({
            ...converted,
            id: crypto.randomUUID(),
            userId: ctx.userId,
          })
          .returning()

        return newBookmark
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

        const [updatedBookmark] = await db
          .update(bookmark)
          .set(converted)
          .where(and(eq(bookmark.id, id), eq(bookmark.userId, ctx.userId)))
          .returning()

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

      await db.delete(bookmark).where(and(eq(bookmark.id, id), eq(bookmark.userId, ctx.userId)))

      return { success: true }
    }),
})
