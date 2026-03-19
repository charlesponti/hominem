import React, { useState } from 'react'
import TestRenderer, { act } from 'react-test-renderer'

vi.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native')

  return {
    __esModule: true,
    default: ({ testID }) => React.createElement(View, { testID }),
  }
})

describe('focus note editing sheet', () => {
  async function renderSheet() {
    const { NoteEditingSheet } = await import('../../components/focus/note-editing-sheet')

    function NoteEditingHarness() {
      const [text, setText] = useState('Hello')
      const [scheduledFor, setScheduledFor] = useState<Date | null>(
        new Date('2026-03-19T10:00:00.000Z'),
      )

      return React.createElement(NoteEditingSheet, {
        title: 'Draft note',
        text,
        scheduledFor,
        onScheduledForChange: setScheduledFor,
        onSave: vi.fn(),
        onTextChange: setText,
      })
    }

    let tree: TestRenderer.ReactTestRenderer | null = null

    await act(async () => {
      tree = TestRenderer.create(React.createElement(NoteEditingHarness))
    })

    return tree!
  }

  it('renders the note sheet with a dominant editor, metadata, and save footer', async () => {
    const tree = await renderSheet()
    const root = tree.root

    expect(root.findByProps({ testID: 'note-editing-sheet' })).toBeTruthy()
    expect(root.findByProps({ testID: 'note-editing-sheet-handle' })).toBeTruthy()
    expect(root.findByProps({ testID: 'note-editing-sheet-header' })).toBeTruthy()
    expect(root.findByProps({ testID: 'note-editing-sheet-editor' })).toBeTruthy()
    expect(root.findByProps({ testID: 'note-editing-sheet-metadata' })).toBeTruthy()
    expect(root.findByProps({ testID: 'note-editing-sheet-footer' })).toBeTruthy()
    expect(root.findByProps({ testID: 'note-editing-sheet-save' })).toBeTruthy()
    expect(root.findByProps({ accessibilityLabel: 'Edit due date' })).toBeTruthy()
    expect(root.findByProps({ testID: 'note-editing-sheet-input', value: 'Hello' })).toBeTruthy()
  })

})
