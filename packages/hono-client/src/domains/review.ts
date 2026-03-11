import type { RawHonoClient } from '../core/raw-client'
import type { ReviewAcceptOutput, ReviewRejectOutput } from '@hominem/hono-rpc/types/review.types'

export interface ReviewAcceptClientInput {
  reviewItemId: string
  finalTitle?: string
}

export interface ReviewRejectClientInput {
  reviewItemId: string
}

export interface ReviewClient {
  accept(input: ReviewAcceptClientInput): Promise<ReviewAcceptOutput>
  reject(input: ReviewRejectClientInput): Promise<ReviewRejectOutput>
}

export function createReviewClient(rawClient: RawHonoClient): ReviewClient {
  return {
    async accept(input) {
      const res = await rawClient.api.review[':reviewItemId'].accept.$post({
        param: { reviewItemId: input.reviewItemId },
        json: input.finalTitle ? { finalTitle: input.finalTitle } : {},
      })
      return res.json() as Promise<ReviewAcceptOutput>
    },
    async reject(input) {
      const res = await rawClient.api.review[':reviewItemId'].reject.$post({
        param: { reviewItemId: input.reviewItemId },
      })
      return res.json() as Promise<ReviewRejectOutput>
    },
  }
}
