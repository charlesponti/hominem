import type { ChatPendingReview, SessionSource } from '@hominem/ui/chat'

export type { ChatPendingReview }

export async function persistChatReviewAsNote(input: {
  review: ChatPendingReview
  createNote: (review: ChatPendingReview) => Promise<{ id: string; title?: string | null }>
}): Promise<SessionSource> {
  const note = await input.createNote(input.review)

  return {
    kind: 'artifact',
    id: note.id,
    type: 'note',
    title: note.title || input.review.proposedTitle,
  }
}
