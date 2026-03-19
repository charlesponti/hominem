import type { Note } from '@hominem/hono-rpc/types'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'

import { NoteEditingSheet } from '~/components/focus/note-editing-sheet'
import { getTimezone } from '~/utils/dates'
import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp'
import { focusKeys } from '~/utils/services/notes/query-keys'
import {
  useUpdateFocusItem,
  type UpdateFocusItemInput,
} from '~/utils/services/notes/use-update-focus'

function getFocusItemLabel(focusItem: Note): string {
  return focusItem.title || focusItem.excerpt || focusItem.content || 'Untitled note'
}

export default function FocusItemView() {
  const { id } = useLocalSearchParams()
  const noteId = String(id ?? '')
  const updateFocusItem = useUpdateFocusItem()
  const queryClient = useQueryClient()
  const focusItemsByKey = queryClient.getQueryData<Note[]>(focusKeys.all)
  const focusItem = focusItemsByKey?.find((item) => item.id === noteId)

  if (!focusItem) {
    return null
  }

  const [text, setText] = useState(getFocusItemLabel(focusItem))
  const [category] = useState(focusItem.type || 'note')
  const [scheduledFor, setScheduledFor] = useState<Date | null>(
    focusItem.scheduledFor ? parseInboxTimestamp(focusItem.scheduledFor) : null,
  )

  const onSave = useCallback(async () => {
    const input: UpdateFocusItemInput = {
      id: focusItem.id,
      text,
      category,
      scheduledFor,
      timezone: getTimezone(),
    }

    try {
      await updateFocusItem.mutateAsync(input)
    } catch (error) {
      console.error(error)
    }
  }, [category, focusItem.id, scheduledFor, text, updateFocusItem])

  return (
    <NoteEditingSheet
      title={getFocusItemLabel(focusItem)}
      text={text}
      scheduledFor={scheduledFor}
      isSaving={updateFocusItem.isPending}
      onTextChange={setText}
      onScheduledForChange={setScheduledFor}
      onSave={onSave}
    />
  )
}

