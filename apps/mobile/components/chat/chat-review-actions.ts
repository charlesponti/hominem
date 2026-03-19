import type { ArtifactType } from '@hominem/chat-services/types'

import type { SessionSource } from './context-anchor'

export interface ChatPendingReview {
  proposedType: ArtifactType
  proposedTitle: string
  proposedChanges: string[]
  previewContent: string
}

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
