import { describe, expect, it } from 'vitest'

import { toInboxStreamItems } from '../../components/workspace/inbox-stream-items'

describe('inbox stream items', () => {
  it('merges notes and chats into one reverse-chronological stream', () => {
    const items = toInboxStreamItems({
      focusItems: [
        {
          id: 'note-1',
          title: 'Old note',
          content: 'Old note',
          excerpt: 'Old note',
          status: 'draft',
          type: 'note',
          tags: [],
          mentions: [],
          analysis: null,
          publishingMetadata: null,
          parentNoteId: null,
          versionNumber: 1,
          isLatestVersion: true,
          userId: 'user-1',
          createdAt: '2026-03-17T10:00:00.000Z',
          updatedAt: '2026-03-17T10:00:00.000Z',
          publishedAt: null,
          scheduledFor: null,
        },
        {
          id: 'note-2',
          title: 'Newest note',
          content: 'Newest note',
          excerpt: 'Newest note',
          status: 'published',
          type: 'note',
          tags: [],
          mentions: [],
          analysis: null,
          publishingMetadata: null,
          parentNoteId: null,
          versionNumber: 1,
          isLatestVersion: true,
          userId: 'user-1',
          createdAt: '2026-03-18T12:00:00.000Z',
          updatedAt: '2026-03-18T12:00:00.000Z',
          publishedAt: null,
          scheduledFor: null,
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
          title: 'Capture this thought for later refinement',
          content: 'Capture this thought for later refinement',
          excerpt: 'Capture this thought for later refinement',
          status: 'published',
          type: 'note',
          tags: [],
          mentions: [],
          analysis: null,
          publishingMetadata: null,
          parentNoteId: null,
          versionNumber: 1,
          isLatestVersion: true,
          userId: 'user-1',
          createdAt: '2026-03-18T09:00:00.000Z',
          updatedAt: '2026-03-18T09:00:00.000Z',
          publishedAt: null,
          scheduledFor: null,
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
    expect(chatItem.preview).toBeNull()
    expect(noteItem.title).toBe('Capture this thought for later refinement')
    expect(noteItem.preview).toBeNull()
  })

  it('keeps previews optional for the default row contract', () => {
    const [item] = toInboxStreamItems({
      focusItems: [
        {
          id: 'note-3',
          title: 'A single line title',
          content: 'A single line title',
          excerpt: 'A single line title',
          status: 'published',
          type: 'note',
          tags: [],
          mentions: [],
          analysis: null,
          publishingMetadata: null,
          parentNoteId: null,
          versionNumber: 1,
          isLatestVersion: true,
          userId: 'user-1',
          createdAt: '2026-03-18T11:00:00.000Z',
          updatedAt: '2026-03-18T11:00:00.000Z',
          publishedAt: null,
          scheduledFor: null,
        },
      ],
      sessions: [],
    })

    expect(item.title).toBe('A single line title')
    expect(item.preview).toBeNull()
  })
})
