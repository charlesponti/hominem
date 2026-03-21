import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { vi } from 'vitest'
import {
  getLastNoteEditingSheetProps,
  resetLastNoteEditingSheetProps,
} from '../__mocks__/note-editing-sheet'

type MockNote = {
  id: string
  title?: string | null
  excerpt?: string | null
  content?: string | null
  type?: string | null
  scheduledFor?: string | null
}

let mockCachedNotes: MockNote[] | undefined
let mockFocusItem: MockNote | undefined
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'note-1' }),
}))

vi.mock('react-native', () => ({
  Alert: {
    alert: vi.fn(),
  },
}))

vi.mock('@hominem/rpc/react', () => ({
  useApiClient: () => ({
    notes: {
      get: vi.fn(async () => mockFocusItem),
    },
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    getQueryData: () => mockCachedNotes,
    setQueryData: vi.fn(),
  }),
  useQuery: () => ({
    data: mockFocusItem ?? mockCachedNotes?.find((item) => item.id === 'note-1'),
  }),
}))

vi.mock('~/utils/dates', () => ({
  getTimezone: () => 'America/Los_Angeles',
}))

vi.mock('~/utils/date/parse-inbox-timestamp', () => ({
  parseInboxTimestamp: (value: string) => new Date(value),
}))

vi.mock('~/utils/services/notes/query-keys', () => ({
  focusKeys: {
    all: ['focus'],
    detail: (id: string) => ['focus', 'detail', id],
  },
}))

vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///tmp/',
  writeAsStringAsync: vi.fn(),
  EncodingType: {
    UTF8: 'utf8',
  },
}))

vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn(),
}))

vi.mock('expo-print', () => ({
  printAsync: vi.fn(),
}))

vi.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: vi.fn(),
  getCalendarsAsync: vi.fn(),
  createEventAsync: vi.fn(),
  EntityTypes: {
    EVENT: 'event',
  },
}))

vi.mock('@react-native-community/datetimepicker', () => ({ default: () => null }))

describe('focus item view', () => {
  beforeEach(() => {
    mockCachedNotes = undefined
    mockFocusItem = undefined
    resetLastNoteEditingSheetProps()
  })

  it('can recover from an empty cache without triggering a hook order error', async () => {
    const { default: FocusItemView } = await import('../../app/(protected)/(tabs)/focus/[id]')

    const rendered = await render(<FocusItemView />)

    expect(getLastNoteEditingSheetProps()).toBeNull()
    expect(screen.queryByTestId('note-editing-sheet')).toBeNull()

    mockFocusItem = {
      id: 'note-1',
      title: 'Recovered note',
      content: 'Restored from cache',
      type: 'note',
      scheduledFor: null,
    }

    await expect(rendered.rerender(<FocusItemView />)).resolves.toBeUndefined()

    expect(getLastNoteEditingSheetProps()).toMatchObject({
      note: expect.objectContaining({
        id: 'note-1',
        title: 'Recovered note',
      }),
      text: 'Restored from cache',
      isSaving: false,
    })
  })
})
