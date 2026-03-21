import type { ReviewItem } from '@hominem/chat-services/types'

// In-memory store for pending ReviewItems — ephemeral by design.
// ReviewItems are reviewed within seconds; no DB persistence needed for MVP.
// TTL: 1 hour. Items older than TTL are evicted on next access/write.

const TTL_MS = 60 * 60 * 1000
const store = new Map<string, ReviewItem>()

function evictStale() {
  const now = Date.now()
  for (const [id, item] of store.entries()) {
    if (now - new Date(item.createdAt).getTime() > TTL_MS) {
      store.delete(id)
    }
  }
}

export function setReviewItem(item: ReviewItem): void {
  evictStale()
  store.set(item.id, item)
}

export function getReviewItem(reviewItemId: string): ReviewItem | undefined {
  return store.get(reviewItemId)
}

export function deleteReviewItem(reviewItemId: string): boolean {
  return store.delete(reviewItemId)
}
