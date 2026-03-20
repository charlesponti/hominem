import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { vi } from 'vitest'

import { NoteEditingSheet } from '../../components/focus/note-editing-sheet'

const mockInsets = {
  top: 0,
  right: 0,
  bottom: 12,
  left: 0,
}

const note = {
  id: 'note-1',
  title: 'Untitled note',
  content: 'Hello',
  excerpt: 'Hello',
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
  createdAt: '2026-03-19T10:00:00.000Z',
  updatedAt: '2026-03-19T10:00:00.000Z',
  publishedAt: null,
  scheduledFor: null,
}

vi.mock('@react-native-community/datetimepicker', () => ({
  default: (props: Record<string, never>) => {
    return React.createElement('DateTimePicker', {
      testID: 'note-editing-sheet-date-picker',
      ...props,
    })
  },
}))

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}))

vi.mock('../../theme', () => ({
  Text: ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
    return React.createElement('Text', { testID }, children)
  },
  theme: {
    colors: {
      foreground: '#ffffff',
      background: '#000000',
      'border-default': '#333333',
      'bg-surface': '#111111',
      'text-tertiary': '#888888',
      'text-secondary': '#aaaaaa',
    },
    spacing: {
      xs_4: 4,
      sm_8: 8,
      sm_12: 12,
      m_16: 16,
      ml_24: 24,
    },
    borderRadii: {
      full: 999,
      md: 12,
    },
  },
  makeStyles: (builder: (theme: {
    colors: Record<string, string>
    spacing: Record<string, number>
    borderRadii: Record<string, number>
  }) => Record<string, unknown>) => {
    return () => builder({
      colors: {
        foreground: '#ffffff',
        background: '#000000',
        'border-default': '#333333',
        'bg-surface': '#111111',
        'text-tertiary': '#888888',
        'text-secondary': '#aaaaaa',
      },
      spacing: {
        xs_4: 4,
        sm_8: 8,
        sm_12: 12,
        m_16: 16,
        ml_24: 24,
      },
      borderRadii: {
        full: 999,
        md: 12,
      },
    })
  },
}))

vi.mock('../../components/Button', () => ({
  Button: ({
    title,
    testID,
    onPress,
    disabled,
    isLoading,
    children,
  }: {
    title?: string
    testID?: string
    onPress?: () => void
    disabled?: boolean
    isLoading?: boolean
    children?: React.ReactNode
  }) => {
    return React.createElement(
      'Button',
      {
        accessibilityRole: 'button',
        accessibilityState: { disabled, busy: isLoading },
        disabled,
        onPress,
        testID,
        title,
      },
      React.createElement('Text', null, children ?? title),
    )
  },
}))

vi.mock('../../components/text-input', () => ({
  default: (props: Record<string, never>) => {
    return React.createElement('TextInput', props)
  },
}))

vi.mock('../../components/ui/icon', () => ({
  __esModule: true,
  default: () => null,
}))

function renderSheet(props: Partial<React.ComponentProps<typeof NoteEditingSheet>> = {}) {
  return render(
    <NoteEditingSheet
      note={note}
      text="Hello"
      scheduledFor={null}
      onTextChange={vi.fn()}
      onScheduledForChange={vi.fn()}
      onSave={vi.fn()}
      {...props}
    />,
  )
}

describe('focus note editing sheet', () => {
  it('renders safely when the note prop is temporarily unavailable', async () => {
    await renderSheet({
      note: undefined,
      text: 'Recovered draft',
    })

    expect(screen.getByTestId('note-editing-sheet-header')).toBeTruthy()
    expect(screen.getByText('Untitled note')).toBeTruthy()
    expect(screen.getByTestId('note-editing-sheet-input').props.value).toBe('Recovered draft')
  })

  it('renders the note sheet with a compact header, dominant editor, metadata card, and save footer', async () => {
    await renderSheet()

    expect(screen.getByTestId('note-editing-sheet-header')).toBeTruthy()
    expect(screen.getByTestId('note-editing-sheet-editor')).toBeTruthy()
    expect(screen.getByTestId('note-editing-sheet-metadata')).toBeTruthy()
    expect(screen.getByTestId('note-editing-sheet-footer')).toBeTruthy()
    expect(screen.getByTestId('note-editing-sheet-due-date-label').props.children).toBe(
      'Set due date',
    )
    expect(screen.getByTestId('note-editing-sheet-save').props.title).toBe('Save')
  })

  it('keeps due date editable and save reachable from the footer', async () => {
    const onScheduledForChange = vi.fn()
    await renderSheet({
      scheduledFor: new Date('2026-03-19T10:30:00.000Z'),
      onScheduledForChange,
    })

    await fireEvent.press(screen.getByTestId('note-editing-sheet-due-date-control'))

    expect(screen.getByTestId('note-editing-sheet-date-picker')).toBeTruthy()

    await fireEvent.press(screen.getByTestId('note-editing-sheet-clear-due-date'))

    expect(onScheduledForChange).toHaveBeenCalledWith(null)
    expect(screen.getByTestId('note-editing-sheet-save').props.title).toBe('Save')
  })

  it('propagates text edits when the editor is enabled', async () => {
    const onTextChange = vi.fn()

    await renderSheet({
      onTextChange,
    })

    await fireEvent(screen.getByTestId('note-editing-sheet-input'), 'changeText', 'Updated copy')

    expect(onTextChange).toHaveBeenCalledWith('Updated copy')
  })

  it('disables save affordance while saving', async () => {
    const onTextChange = vi.fn()
    await renderSheet({
      isSaving: true,
      onTextChange,
    })
    expect(screen.getByTestId('note-editing-sheet-save').props.disabled).toBe(true)

    await fireEvent.press(screen.getByTestId('note-editing-sheet-due-date-control'))

    expect(screen.queryByTestId('note-editing-sheet-date-picker')).toBeNull()
  })
})
