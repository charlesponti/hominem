import type { Note } from '@hominem/rpc/types'
import * as Calendar from 'expo-calendar'
import * as FileSystem from 'expo-file-system/legacy'
import * as Print from 'expo-print'
import { useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import React from 'react'
import { useCallback, useState } from 'react'
import { Alert } from 'react-native'

import { NoteEditingSheet } from '~/components/focus/note-editing-sheet'
import { getTimezone } from '~/utils/dates'
import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp'
import { useFocusItemQuery } from '~/utils/services/notes/use-focus-item-query'
import {
  useUpdateFocusItem,
  type UpdateFocusItemInput,
} from '~/utils/services/notes/use-update-focus'

function getFocusItemLabel(focusItem: Note): string {
  return focusItem.title || focusItem.excerpt || focusItem.content || 'Untitled note'
}

function getFocusItemBody(focusItem: Note): string {
  return focusItem.content || focusItem.excerpt || focusItem.title || ''
}

export default function FocusItemView() {
  const { id } = useLocalSearchParams()
  const noteId = String(id ?? '')
  const { data: focusItem } = useFocusItemQuery({
    noteId,
    enabled: noteId.length > 0,
  })

  if (!focusItem) {
    return null
  }

  return <FocusItemEditor key={focusItem.id} focusItem={focusItem} />
}

function FocusItemEditor({ focusItem }: { focusItem: Note }) {
  const updateFocusItem = useUpdateFocusItem()
  const [text, setText] = useState(() => getFocusItemBody(focusItem))
  const [scheduledFor, setScheduledFor] = useState<Date | null>(() =>
    focusItem.scheduledFor ? parseInboxTimestamp(focusItem.scheduledFor) : null,
  )

  const onAddToCalendar = useCallback(async () => {
    if (!scheduledFor) return
    const { status } = await Calendar.requestCalendarPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Calendar access is needed to create events.')
      return
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
    const defaultCalendar = calendars.find((c) => c.allowsModifications) ?? calendars[0]
    if (!defaultCalendar) return
    await Calendar.createEventAsync(defaultCalendar.id, {
      title: getFocusItemLabel(focusItem),
      notes: text,
      startDate: scheduledFor,
      endDate: new Date(scheduledFor.getTime() + 60 * 60 * 1000),
    })
    Alert.alert('Added to Calendar', 'Event created successfully.')
  }, [focusItem, scheduledFor, text])

  const onPrint = useCallback(async () => {
    const html = `<h1>${getFocusItemLabel(focusItem)}</h1><p>${text.replace(/\n/g, '<br/>')}</p>`
    await Print.printAsync({ html })
  }, [focusItem, text])

  const onShare = useCallback(async () => {
    const content = `${getFocusItemLabel(focusItem)}\n\n${text}`
    const uri = `${FileSystem.cacheDirectory}note_${focusItem.id}.txt`
    await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 })
    await Sharing.shareAsync(uri, { mimeType: 'text/plain', UTI: 'public.plain-text' })
  }, [focusItem, text])

  const onSave = useCallback(async () => {
    const input: UpdateFocusItemInput = {
      id: focusItem.id,
      text,
      category: focusItem.type || 'note',
      scheduledFor,
      timezone: getTimezone(),
    }

    try {
      await updateFocusItem.mutateAsync(input)
    } catch (error) {
      console.error(error)
    }
  }, [focusItem, scheduledFor, text, updateFocusItem])

  return (
    <NoteEditingSheet
      note={focusItem}
      text={text}
      scheduledFor={scheduledFor}
      isSaving={updateFocusItem.isPending}
      onTextChange={setText}
      onScheduledForChange={setScheduledFor}
      onSave={onSave}
      onShare={() => void onShare()}
      onAddToCalendar={() => void onAddToCalendar()}
      onPrint={() => void onPrint()}
    />
  )
}
