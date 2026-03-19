import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'

import type { Note } from '@hominem/hono-rpc/types'
import { NoteEditingSheet } from '~/components/focus/note-editing-sheet'
import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp'
import { getTimezone } from '~/utils/dates'
import { focusKeys } from '~/utils/services/notes/query-keys'
import {
  useUpdateFocusItem,
  type UpdateFocusItemInput,
} from '~/utils/services/notes/use-update-focus'

export default function FocusItemView() {
  const { id } = useLocalSearchParams()
  const noteId = String(id ?? '')
  const queryClient = useQueryClient()
  const focusItems = queryClient.getQueryData<Note[]>(focusKeys.all)
  const focusItem = focusItems?.find((item) => item.id === noteId)

  if (!focusItem) {
    return null
  }

  return <FocusItemEditor key={focusItem.id} note={focusItem} />
}

interface FocusItemEditorProps {
  note: Note
}

function FocusItemEditor({ note }: FocusItemEditorProps) {
  const updateFocusItem = useUpdateFocusItem()
  const [text, setText] = useState(note.content || note.excerpt || note.title || '')
  const [scheduledFor, setScheduledFor] = useState<Date | null>(
    note.scheduledFor ? parseInboxTimestamp(note.scheduledFor) : null,
  )
  const category = note.type || 'note'

  const handleSave = async () => {
    const input: UpdateFocusItemInput = {
      id: note.id,
      text,
      category,
      ...(scheduledFor !== undefined ? { scheduledFor } : {}),
      timezone: getTimezone(),
    }

    try {
      await updateFocusItem.mutateAsync(input)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <NoteEditingSheet
      title={note.title || note.excerpt || note.content || 'Untitled note'}
      text={text}
      scheduledFor={scheduledFor}
      isSaving={updateFocusItem.isPending}
      onTextChange={setText}
      onScheduledForChange={setScheduledFor}
      onSave={handleSave}
    />
  )
}
