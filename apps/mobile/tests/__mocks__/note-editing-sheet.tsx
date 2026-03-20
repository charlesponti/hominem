import React from 'react'

let lastSheetProps: Record<string, unknown> | null = null

export function getLastNoteEditingSheetProps() {
  return lastSheetProps
}

export function resetLastNoteEditingSheetProps() {
  lastSheetProps = null
}

export function NoteEditingSheet(props: Record<string, unknown>) {
  lastSheetProps = props

  return React.createElement('NoteEditingSheet', props)
}
