import { useEffect } from 'react'
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Chat } from '@hominem/chat-services'
import type { Note } from '@hominem/rpc/types/notes.types'

const mocks = vi.hoisted(() => {
  const notesList = vi.fn()
  const chatsList = vi.fn()

  return {
    notesList,
    chatsList,
  }
})

vi.mock('@hominem/rpc/react', () => ({
  useHonoQuery: () => ({
    data: mocks.chatsList(),
    isLoading: false,
  }),
}))

vi.mock('./use-notes', () => ({
  useNotesList: () => ({
    data: mocks.notesList(),
    isLoading: false,
  }),
}))

import { useInboxStream } from './use-inbox-stream'

interface InboxStreamResultItem {
  kind: 'note' | 'chat'
  title: string
  preview: string | null
}

interface InboxStreamResult {
  items: InboxStreamResultItem[]
  noteCount: number
  chatCount: number
}

function HookProbe({
  onValue,
}: {
  onValue: (value: InboxStreamResult) => void
}) {
  const value = useInboxStream()

  useEffect(() => {
    onValue(value)
  }, [onValue, value])

  return null
}

function createNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    userId: 'user-1',
    type: 'note',
    status: 'published',
    title: 'Captured note',
    content: 'Captured note body',
    excerpt: 'Captured note body',
    tags: [],
    mentions: [],
    analysis: null,
    publishingMetadata: null,
    parentNoteId: null,
    versionNumber: 1,
    isLatestVersion: true,
    publishedAt: null,
    scheduledFor: null,
    createdAt: '2026-03-20T09:00:00.000Z',
    updatedAt: '2026-03-20T09:00:00.000Z',
    ...overrides,
  }
}

function createChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: 'chat-1',
    title: null,
    updatedAt: '2026-03-20T10:00:00.000Z',
    createdAt: '2026-03-20T09:30:00.000Z',
    ...overrides,
  } as Chat
}

describe('useInboxStream', () => {
  beforeEach(() => {
    mocks.notesList.mockReset()
    mocks.chatsList.mockReset()
  })

  it('keeps previews nullable and uses the shared chat fallback title', async () => {
    mocks.notesList.mockReturnValue([createNote()])
    mocks.chatsList.mockReturnValue([createChat()])

    let value: InboxStreamResult | null = null

    render(
      <HookProbe
        onValue={(nextValue) => {
          value = nextValue
        }}
      />,
    )

    await waitFor(() => {
      expect(value).not.toBeNull()
    })

    if (value === null) {
      throw new Error('Expected hook result')
    }

    const result = value as InboxStreamResult

    expect(result.items).toHaveLength(2)
    const chatItem = result.items.find((item: InboxStreamResultItem) => item.kind === 'chat')
    const noteItem = result.items.find((item: InboxStreamResultItem) => item.kind === 'note')

    expect(chatItem?.title).toBe('Untitled session')
    expect(chatItem?.preview).toBeNull()
    expect(noteItem?.preview).toBeNull()
    expect(result.noteCount).toBe(1)
    expect(result.chatCount).toBe(1)
  })
})
