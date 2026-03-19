import { describe, expect, it, vi } from 'vitest'

import {
  persistChatReviewAsNote,
  type ChatPendingReview,
} from '../../components/chat/chat-review-actions'

const review: ChatPendingReview = {
  proposedType: 'note',
  proposedTitle: 'Test note',
  proposedChanges: ['a'],
  previewContent: 'Hello world',
}

describe('chat review actions', () => {
  it('creates a note and returns the persisted source', async () => {
    const createNote = vi.fn(async () => ({
      id: 'note-1',
      title: 'Server title',
    }))

    await expect(persistChatReviewAsNote({ review, createNote })).resolves.toEqual({
      kind: 'artifact',
      id: 'note-1',
      type: 'note',
      title: 'Server title',
    })

    expect(createNote).toHaveBeenCalledWith(review)
  })

  it('falls back to the proposed title when the server title is empty', async () => {
    const createNote = vi.fn(async () => ({
      id: 'note-2',
      title: '',
    }))

    await expect(persistChatReviewAsNote({ review, createNote })).resolves.toEqual({
      kind: 'artifact',
      id: 'note-2',
      type: 'note',
      title: 'Test note',
    })
  })
})
