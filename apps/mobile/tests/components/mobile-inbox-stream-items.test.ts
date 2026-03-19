import { describe, expect, it } from 'vitest'

import { toInboxStreamItems } from '../../components/workspace/inbox-stream-items'

describe('inbox stream items', () => {
  it('merges notes and chats into one reverse-chronological stream', () => {
    const items = toInboxStreamItems({
      focusItems: [
        {
          id: 'note-1',
          text: 'Old note',
          category: null,
          due_date: null,
          state: 'active',
          created_at: '2026-03-17T10:00:00.000Z',
          updated_at: '2026-03-17T10:00:00.000Z',
        },
        {
          id: 'note-2',
          text: 'Newest note',
          category: null,
          due_date: null,
          state: 'active',
          created_at: '2026-03-18T12:00:00.000Z',
          updated_at: '2026-03-18T12:00:00.000Z',
          source_note: {
            id: 'source-note-2',
            title: 'Source note title',
          },
        },
      ],
      sessions: [
        {
          archivedAt: null,
          id: 'chat-1',
          title: 'Recent chat',
          createdAt: '2026-03-18T11:00:00.000Z',
          updatedAt: '2026-03-18T11:00:00.000Z',
          activityAt: '2026-03-18T11:30:00.000Z',
        },
      ],
    })

    expect(items.map((item) => ({ id: item.id, kind: item.kind }))).toEqual([
      { id: 'note-2', kind: 'note' },
      { id: 'chat-1', kind: 'chat' },
      { id: 'note-1', kind: 'note' },
    ])
  })

  it('derives stable titles and previews for notes and chats', () => {
    const [chatItem, noteItem] = toInboxStreamItems({
      focusItems: [
        {
          id: 'note-1',
          text: 'Capture this thought for later refinement',
          category: null,
          due_date: null,
          state: 'active',
          created_at: '2026-03-18T09:00:00.000Z',
          updated_at: '2026-03-18T09:00:00.000Z',
        },
      ],
      sessions: [
        {
          archivedAt: null,
          id: 'chat-1',
          title: null,
          createdAt: '2026-03-18T10:00:00.000Z',
          updatedAt: '2026-03-18T10:00:00.000Z',
          activityAt: '2026-03-18T10:30:00.000Z',
        },
      ],
    })

    expect(chatItem.title).toBe('Untitled session')
    expect(chatItem.preview).toBe('Conversation activity')
    expect(noteItem.title).toBe('Capture this thought for later refinement')
    expect(noteItem.preview).toBe('Note')
  })
})
