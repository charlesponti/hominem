import type { Note } from '@hominem/rpc/types';
import * as Calendar from 'expo-calendar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { NoteEditingSheet } from '~/components/focus/note-editing-sheet';
import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp';
import { getTimezone } from '~/utils/dates';
import { useNoteQuery } from '~/utils/services/notes/use-note-query';
import { useUpdateNote, type UpdateNoteInput } from '~/utils/services/notes/use-update-note';

function getNoteLabel(focusItem: Note): string {
  return focusItem.title || focusItem.excerpt || focusItem.content || 'Untitled note';
}

function getNoteBody(focusItem: Note): string {
  return focusItem.content || focusItem.excerpt || focusItem.title || '';
}

export default function NoteView() {
  const { id } = useLocalSearchParams();
  const noteId = String(id ?? '');
  const { data: note } = useNoteQuery({
    noteId,
    enabled: noteId.length > 0,
  });

  if (!note) {
    return null;
  }

  return <NoteEditor key={note.id} note={note} />;
}

function NoteEditor({ note }: { note: Note }) {
  const updateNote = useUpdateNote();
  const [text, setText] = useState(() => getNoteBody(note));
  const [scheduledFor, setScheduledFor] = useState<Date | null>(() =>
    note.scheduledFor ? parseInboxTimestamp(note.scheduledFor) : null,
  );

  const onAddToCalendar = useCallback(async () => {
    if (!scheduledFor) return;
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Calendar access is needed to create events.');
      return;
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCalendar = calendars.find((c) => c.allowsModifications) ?? calendars[0];
    if (!defaultCalendar) return;
    await Calendar.createEventAsync(defaultCalendar.id, {
      title: getNoteLabel(note),
      notes: text,
      startDate: scheduledFor,
      endDate: new Date(scheduledFor.getTime() + 60 * 60 * 1000),
    });
    Alert.alert('Added to Calendar', 'Event created successfully.');
  }, [note, scheduledFor, text]);

  const onPrint = useCallback(async () => {
    const html = `<h1>${getNoteLabel(note)}</h1><p>${text.replace(/\n/g, '<br/>')}</p>`;
    await Print.printAsync({ html });
  }, [note, text]);

  const onShare = useCallback(async () => {
    const content = `${getNoteLabel(note)}\n\n${text}`;
    const uri = `${FileSystem.cacheDirectory}note_${note.id}.txt`;
    await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri, { mimeType: 'text/plain', UTI: 'public.plain-text' });
  }, [note, text]);

  const onSave = useCallback(async () => {
    const input: UpdateNoteInput = {
      id: note.id,
      text,
      category: note.type || 'note',
      scheduledFor,
      timezone: getTimezone(),
    };

    try {
      await updateNote.mutateAsync(input);
    } catch (error) {
      console.error(error);
    }
  }, [note, scheduledFor, text, updateNote]);

  return (
    <NoteEditingSheet
      note={note}
      text={text}
      scheduledFor={scheduledFor}
      isSaving={updateNote.isPending}
      onTextChange={setText}
      onScheduledForChange={setScheduledFor}
      onSave={onSave}
      onShare={() => void onShare()}
      onAddToCalendar={() => void onAddToCalendar()}
      onPrint={() => void onPrint()}
    />
  );
}
