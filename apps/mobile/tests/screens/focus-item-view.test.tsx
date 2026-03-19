import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'

type MockNote = {
  id: string
  title?: string | null
  excerpt?: string | null
  content?: string | null
  type?: string | null
  scheduledFor?: string | null
}

let mockCachedNotes: MockNote[] | undefined
let mockLastSheetProps: Record<string, unknown> | null = null

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'note-1' }),
}))

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    getQueryData: () => mockCachedNotes,
  }),
}))

jest.mock('~/components/focus/note-editing-sheet', () => ({
  NoteEditingSheet: (props: Record<string, unknown>) => {
    mockLastSheetProps = props
    return null
  },
}))

jest.mock('~/utils/dates', () => ({
  getTimezone: () => 'America/Los_Angeles',
}))

jest.mock('~/utils/date/parse-inbox-timestamp', () => ({
  parseInboxTimestamp: (value: string) => new Date(value),
}))

jest.mock('~/utils/services/notes/query-keys', () => ({
  focusKeys: {
    all: ['focus'],
  },
}))

jest.mock('~/utils/services/notes/use-update-focus', () => ({
  useUpdateFocusItem: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
}))

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///tmp/',
  writeAsStringAsync: jest.fn(),
  EncodingType: {
    UTF8: 'utf8',
  },
}))

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}))

jest.mock('expo-print', () => ({
  printAsync: jest.fn(),
}))

jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  createEventAsync: jest.fn(),
  EntityTypes: {
    EVENT: 'event',
  },
}))

jest.mock('@react-native-community/datetimepicker', () => () => null)

const FocusItemView = require('../../app/(protected)/(tabs)/focus/[id]').default

describe('focus item view', () => {
  beforeEach(() => {
    mockCachedNotes = undefined
    mockLastSheetProps = null
  })

  it('can recover from an empty cache without triggering a hook order error', () => {
    let renderer: TestRenderer.ReactTestRenderer

    act(() => {
      renderer = TestRenderer.create(<FocusItemView />)
    })

    expect(renderer!.toJSON()).toBeNull()

    mockCachedNotes = [
      {
        id: 'note-1',
        title: 'Recovered note',
        content: 'Restored from cache',
        type: 'note',
        scheduledFor: null,
      },
    ]

    expect(() => {
      act(() => {
        renderer!.update(<FocusItemView />)
      })
    }).not.toThrow()

    expect(mockLastSheetProps).toMatchObject({
      title: 'Recovered note',
      text: 'Restored from cache',
      isSaving: false,
    })
  })
})
