import { describe, expect, it } from 'vitest'

import { buildUpdateNoteInput } from '../../utils/services/notes/use-update-note'

describe('focus update contract integration', () => {
  it('omits scheduledFor when it is left unchanged', () => {
    expect(
      buildUpdateNoteInput({
        id: 'note-1',
        text: 'Draft',
        category: 'note',
      }),
    ).toEqual({
      id: 'note-1',
      title: 'Draft',
      excerpt: 'Draft',
      content: 'Draft',
      type: 'note',
    })
  })

  it('serializes scheduledFor as null when clearing a due date', () => {
    expect(
      buildUpdateNoteInput({
        id: 'note-1',
        text: 'Draft',
        category: 'note',
        scheduledFor: null,
      }),
    ).toEqual({
      id: 'note-1',
      title: 'Draft',
      excerpt: 'Draft',
      content: 'Draft',
      type: 'note',
      scheduledFor: null,
    })
  })

  it('serializes scheduledFor as an ISO string when saving a due date', () => {
    expect(
      buildUpdateNoteInput({
        id: 'note-1',
        text: 'Draft',
        category: 'note',
        scheduledFor: new Date('2026-03-19T12:00:00.000Z'),
      }),
    ).toEqual({
      id: 'note-1',
      title: 'Draft',
      excerpt: 'Draft',
      content: 'Draft',
      type: 'note',
      scheduledFor: '2026-03-19T12:00:00.000Z',
    })
  })

  it('forwards uploaded file IDs when present', () => {
    expect(
      buildUpdateNoteInput({
        id: 'note-1',
        text: '',
        category: 'note',
        fileIds: ['11111111-1111-4111-8111-111111111111'],
      }),
    ).toEqual({
      id: 'note-1',
      title: '',
      excerpt: '',
      content: '',
      fileIds: ['11111111-1111-4111-8111-111111111111'],
      type: 'note',
    })
  })
})

