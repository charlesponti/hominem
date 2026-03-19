import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'

import { NoteEditingSheet } from '../../components/focus/note-editing-sheet'

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react')
  const { View } = require('react-native')

  return function MockDateTimePicker(props: Record<string, unknown>) {
    return <View testID="note-editing-sheet-date-picker" {...props} />
  }
})

jest.mock('../../theme', () => ({
  Text: ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
    const { Text } = require('react-native')
    return <Text testID={testID}>{children}</Text>
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
      xl_20: 20,
    },
  },
  makeStyles: () => () => ({}),
}))

jest.mock('../../components/Button', () => ({
  Button: ({
    title,
    testID,
    onPress,
    disabled,
    isLoading,
  }: {
    title?: string
    testID?: string
    onPress?: () => void
    disabled?: boolean
    isLoading?: boolean
  }) => {
    const React = require('react')
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
      title,
    )
  },
}))

jest.mock('../../components/text-input', () => {
  return function MockTextInput(props: {
    testID?: string
    value?: string
    onChangeText?: (value: string) => void
    placeholder?: string
    editable?: boolean
  }) {
    const React = require('react')
    const { TextInput } = require('react-native')
    return <TextInput {...props} />
  }
})

jest.mock('../../components/ui/icon', () => ({
  __esModule: true,
  default: () => null,
}))

describe('focus note editing sheet', () => {
  it('shows the metadata card even when no due date exists and propagates text edits', () => {
    const onTextChange = jest.fn()

    const view = render(
      <NoteEditingSheet
        title="Untitled note"
        text="Hello"
        scheduledFor={null}
        onTextChange={onTextChange}
        onScheduledForChange={jest.fn()}
        onSave={jest.fn()}
      />,
    )

    expect(view.UNSAFE_getByProps({ testID: 'note-editing-sheet' })).toBeTruthy()
    expect(JSON.stringify(view.toJSON())).toContain('Due date')
    expect(view.UNSAFE_getByProps({ testID: 'note-editing-sheet-due-date-label' }).props.children).toBe('Set due date')

    fireEvent.changeText(view.UNSAFE_getByProps({ testID: 'note-editing-sheet-input' }), 'Updated copy')

    expect(onTextChange).toHaveBeenCalledWith('Updated copy')
  })

  it('opens the date picker and allows clearing an existing due date', () => {
    const onScheduledForChange = jest.fn()
    const scheduledFor = new Date('2026-03-19T10:30:00.000Z')

    const view = render(
      <NoteEditingSheet
        title="Untitled note"
        text="Hello"
        scheduledFor={scheduledFor}
        onTextChange={jest.fn()}
        onScheduledForChange={onScheduledForChange}
        onSave={jest.fn()}
      />,
    )

    fireEvent.press(view.UNSAFE_getByProps({ testID: 'note-editing-sheet-due-date-control' }))
    expect(view.UNSAFE_getByProps({ testID: 'note-editing-sheet-date-picker' })).toBeTruthy()

    fireEvent.press(screen.getByTestId('note-editing-sheet-clear-due-date'))
    expect(onScheduledForChange).toHaveBeenCalledWith(null)
  })

  it('disables the save affordance while saving', () => {
    const view = render(
      <NoteEditingSheet
        title="Untitled note"
        text="Hello"
        scheduledFor={null}
        isSaving
        onTextChange={jest.fn()}
        onScheduledForChange={jest.fn()}
        onSave={jest.fn()}
      />,
    )

    expect(screen.getByTestId('note-editing-sheet-save').props.disabled).toBe(true)

    fireEvent.press(view.UNSAFE_getByProps({ testID: 'note-editing-sheet-due-date-control' }))
    expect(() => view.UNSAFE_getByProps({ testID: 'note-editing-sheet-date-picker' })).toThrow()
  })
})
