import { randomUUID } from 'node:crypto'

import { db, NotFoundError, ForbiddenError } from '@hominem/db'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import * as z from 'zod'

import { authMiddleware, type AppContext } from '../middleware/auth'
import { getReviewItem, deleteReviewItem } from '../services/review-store'
import type { ReviewAcceptOutput, ReviewRejectOutput } from '../types/review.types'

const reviewAcceptSchema = z.object({
  finalTitle: z.string().min(1).max(200).optional(),
})

/**
 * Routes for accepting or rejecting a pending review item.
 * Review items are created by POST /api/chats/:id/classify.
 */
export const reviewRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // Accept a review item — persist as a note, return noteId
  .post('/:reviewItemId/accept', zValidator('json', reviewAcceptSchema), async (c) => {
    const reviewItemId = c.req.param('reviewItemId')
    const userId = c.get('userId')!
    const { finalTitle } = c.req.valid('json')

    const item = getReviewItem(reviewItemId)
    if (!item) {
      throw new NotFoundError('Review item not found or already processed')
    }

    const title = finalTitle ?? item.proposedTitle
    const noteId = randomUUID()
    const now = new Date().toISOString()

    await db
      .insertInto('notes')
      .values({
        id: noteId,
        user_id: userId,
        type: 'note',
        status: 'draft',
        title,
        content: item.previewContent,
        excerpt: null,
        mentions: null,
        analysis: null,
        publishing_metadata: null,
        created_at: now,
        updated_at: now,
      })
      .execute()

    deleteReviewItem(reviewItemId)

    return c.json<ReviewAcceptOutput>({ noteId })
  })

  // Reject a review item — discard without persisting
  .post('/:reviewItemId/reject', async (c) => {
    const reviewItemId = c.req.param('reviewItemId')

    const item = getReviewItem(reviewItemId)
    if (!item) {
      throw new NotFoundError('Review item not found or already processed')
    }

    deleteReviewItem(reviewItemId)

    return c.json<ReviewRejectOutput>({ success: true })
  })
