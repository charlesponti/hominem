import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { CalendarEventPatch, CalendarRecurrenceScope } from '~/modules/on-device-ai';
import {
  useCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from '~/services/calendar/calendar-queries';
import type { PersonPickerRecord } from '~/services/people/use-people';
import { useTaskComplete } from '~/services/tasks/use-task-complete';
import { useTaskDelete } from '~/services/tasks/use-task-delete';
import { useTaskQuery } from '~/services/tasks/use-task-query';
import { useTaskUpdate } from '~/services/tasks/use-task-update';

export type TimeBlockDetailSource = 'task' | 'event';
export type ActiveField = 'location' | 'notes' | 'people' | 'time' | 'title' | null;

interface TimeBlockDraft {
  duration: string;
  end: Date | null;
  location: string;
  notes: string;
  people: PersonPickerRecord[];
  start: Date | null;
  title: string;
}

type TimeBlockDraftAction =
  | { type: 'initialize'; draft: TimeBlockDraft }
  | { type: 'set'; field: keyof TimeBlockDraft; value: TimeBlockDraft[keyof TimeBlockDraft] };

function timeBlockDraftReducer(
  state: TimeBlockDraft,
  action: TimeBlockDraftAction,
): TimeBlockDraft {
  if (action.type === 'initialize') return action.draft;
  return { ...state, [action.field]: action.value } as TimeBlockDraft;
}

/**
 * The event API only stores start/end, not a duration — this derives the
 * implied duration the same way for the initial draft and for the dirty
 * check, so the two can't silently drift out of sync.
 */
function computeOriginalSchedule(
  isTask: boolean,
  task: { scheduledStartAt?: string | null; scheduledEndAt?: string | null; durationMinutes?: number | null } | undefined,
  event: { startDate?: string | null; endDate?: string | null } | null,
) {
  const start = isTask ? task?.scheduledStartAt : event?.startDate;
  const end = isTask ? task?.scheduledEndAt : event?.endDate;
  const duration = isTask
    ? task?.durationMinutes
    : start && end
      ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000)
      : null;
  return { start, end, duration };
}

export function useTimeBlockEditorState({
  id,
  initialActiveField = null,
  source,
  onClose,
}: {
  id: string;
  initialActiveField?: ActiveField;
  source: TimeBlockDetailSource;
  onClose: () => void;
}) {
  const isTask = source === 'task';
  const taskQuery = useTaskQuery({ taskId: id, enabled: isTask });
  const { mutateAsync: updateTask, isPending: isSavingTask } = useTaskUpdate();
  const { mutateAsync: deleteTask } = useTaskDelete();
  const { mutate: toggleTask, isPending: isTogglingTask } = useTaskComplete();
  const eventQuery = useCalendarEvent({ enabled: !isTask, id });
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();
  const [eventError, setEventError] = useState('');
  const [draft, dispatchDraft] = useReducer(timeBlockDraftReducer, {
    duration: '',
    end: null,
    location: '',
    notes: '',
    people: [],
    start: null,
    title: '',
  });
  const {
    duration: draftDuration,
    end: draftEnd,
    location: draftLocation,
    notes: draftNotes,
    people: draftPeople,
    start: draftStart,
    title: draftTitle,
  } = draft;
  const setDraftDuration = (value: string) =>
    dispatchDraft({ type: 'set', field: 'duration', value });
  const setDraftStart = (value: Date | null) =>
    dispatchDraft({ type: 'set', field: 'start', value });
  const setDraftEnd = (value: Date | null) => dispatchDraft({ type: 'set', field: 'end', value });
  const setDraftTitle = (value: string) => dispatchDraft({ type: 'set', field: 'title', value });
  const setDraftLocation = (value: string) =>
    dispatchDraft({ type: 'set', field: 'location', value });
  const setDraftNotes = (value: string) => dispatchDraft({ type: 'set', field: 'notes', value });
  const setDraftPeople = (value: PersonPickerRecord[]) =>
    dispatchDraft({ type: 'set', field: 'people', value });
  const [activeField, setActiveField] = useState<ActiveField>(initialActiveField);
  const isSchedulingRef = useRef(false);
  const initializedBlockKeyRef = useRef<string | null>(null);

  const task = taskQuery.data?.task;
  const event = eventQuery.data ?? null;
  const block = isTask ? task : event;
  const isLoading = isTask ? taskQuery.isLoading : eventQuery.isLoading;
  const error = isTask
    ? eventError || (taskQuery.error instanceof Error ? taskQuery.error.message : '')
    : eventError || (eventQuery.error instanceof Error ? eventQuery.error.message : '');
  const title = block?.title ?? 'Time block';
  const location = block?.location ?? null;
  const notes = isTask ? (task?.description ?? null) : (event?.notes ?? null);
  const originalPeople = taskQuery.data?.participants ?? [];

  useEffect(() => {
    if (!block) return;
    const blockKey = `${source}:${id}`;
    if (initializedBlockKeyRef.current === blockKey) return;
    initializedBlockKeyRef.current = blockKey;

    const { start, end, duration } = computeOriginalSchedule(isTask, task, event);
    const defaultStart = new Date();
    dispatchDraft({
      type: 'initialize',
      draft: {
        duration: duration ? String(duration) : '',
        end: end ? new Date(end) : new Date(defaultStart.getTime() + 60 * 60 * 1000),
        location: location ?? '',
        notes: notes ?? '',
        people:
          taskQuery.data?.participants.map((person) => ({
            id: person.personId,
            displayName: person.displayName,
            email: person.email,
          })) ?? [],
        start: start ? new Date(start) : defaultStart,
        title,
      },
    });
    isSchedulingRef.current = Boolean(start && end) || (isTask && initialActiveField === 'time');
  }, [
    block,
    event?.endDate,
    event?.startDate,
    isTask,
    source,
    id,
    location,
    notes,
    task?.durationMinutes,
    task?.scheduledEndAt,
    task?.scheduledStartAt,
    taskQuery.data?.participants,
    title,
    initialActiveField,
  ]);

  const isDirty = useMemo(() => {
    const { start, end, duration } = computeOriginalSchedule(isTask, task, event);
    return (
      draftDuration !== (duration ? String(duration) : '') ||
      draftEnd?.toISOString() !== (end ? new Date(end).toISOString() : undefined) ||
      draftLocation !== (location ?? '') ||
      draftNotes !== (notes ?? '') ||
      draftPeople.map((person) => person.id).join(',') !==
        originalPeople.map((person) => person.personId).join(',') ||
      draftStart?.toISOString() !== (start ? new Date(start).toISOString() : undefined) ||
      draftTitle !== title
    );
  }, [
    draftDuration,
    draftEnd,
    draftLocation,
    draftNotes,
    draftPeople,
    draftStart,
    draftTitle,
    event?.endDate,
    event?.startDate,
    isTask,
    location,
    notes,
    originalPeople,
    taskQuery.data?.participants,
    task?.durationMinutes,
    task?.scheduledEndAt,
    task?.scheduledStartAt,
    title,
  ]);

  const withRecurrenceScope = useCallback(
    (action: (scope: CalendarRecurrenceScope) => void, onCancel?: () => void) => {
      if (!event?.recurrenceDescription) {
        action('thisEvent');
        return;
      }
      Alert.alert('Apply change', 'Choose which events to change.', [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'This event', onPress: () => action('thisEvent') },
        { text: 'All future events', onPress: () => action('futureEvents') },
      ]);
    },
    [event?.recurrenceDescription],
  );

  const saveEventPatch = useCallback(
    (patch: CalendarEventPatch) =>
      new Promise<boolean>((resolve, reject) => {
        withRecurrenceScope(
          (scope) => {
            void updateEvent
              .mutateAsync({ id, patch, recurrenceScope: scope })
              .then(() => {
                setEventError('');
                resolve(true);
              })
              .catch(reject);
          },
          () => resolve(false),
        );
      }),
    [id, updateEvent, withRecurrenceScope],
  );

  const saveChanges = useCallback(async () => {
    if (!draftStart || !draftEnd || draftEnd <= draftStart) {
      setEventError('End time must be after start time.');
      return;
    }
    const durationMinutes = draftDuration ? Number(draftDuration) : null;
    if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes <= 0)) {
      setEventError('Duration must be a positive number of minutes.');
      return;
    }
    try {
      if (isTask) {
        await updateTask({
          taskId: id,
          description: draftNotes.trim() || null,
          durationMinutes,
          location: draftLocation.trim() || null,
          participants: draftPeople.map((person) => person.id),
          scheduledEndAt: isSchedulingRef.current ? draftEnd.toISOString() : null,
          scheduledStartAt: isSchedulingRef.current ? draftStart.toISOString() : null,
          title: draftTitle.trim() || title,
        });
        await taskQuery.refetch();
      } else {
        const didSave = await saveEventPatch({
          endDate: draftEnd.toISOString(),
          location: draftLocation.trim() || null,
          notes: draftNotes.trim() || null,
          startDate: draftStart.toISOString(),
          title: draftTitle.trim() || title,
        });
        if (!didSave) return;
      }
      setEventError('');
      setActiveField(null);
    } catch (saveError) {
      setEventError(saveError instanceof Error ? saveError.message : 'Unable to save this change.');
    }
  }, [
    draftDuration,
    draftEnd,
    draftLocation,
    draftNotes,
    draftPeople,
    draftStart,
    draftTitle,
    id,
    isTask,
    saveEventPatch,
    taskQuery,
    title,
    updateTask,
  ]);

  const remove = useCallback(() => {
    const confirm = () => {
      if (isTask) {
        void deleteTask(id)
          .then(onClose)
          .catch((deleteError) =>
            setEventError(
              deleteError instanceof Error ? deleteError.message : 'Unable to delete task.',
            ),
          );
        return;
      }
      withRecurrenceScope((scope) => {
        void deleteEvent
          .mutateAsync({ id, recurrenceScope: scope })
          .then(onClose)
          .catch((deleteError) =>
            setEventError(
              deleteError instanceof Error ? deleteError.message : 'Unable to delete event.',
            ),
          );
      });
    };
    Alert.alert('Delete time block?', `Delete ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: confirm },
    ]);
  }, [deleteEvent, deleteTask, id, isTask, onClose, title, withRecurrenceScope]);

  return {
    activeField,
    setActiveField,
    block,
    draftDuration,
    setDraftDuration,
    draftEnd,
    setDraftEnd,
    draftLocation,
    setDraftLocation,
    draftNotes,
    setDraftNotes,
    draftPeople,
    setDraftPeople,
    draftStart,
    setDraftStart,
    draftTitle,
    setDraftTitle,
    error,
    event,
    isDirty,
    isLoading,
    isSavingTask,
    isSchedulingRef,
    isTask,
    isTogglingTask,
    remove,
    saveChanges,
    saving: isSavingTask || updateEvent.isPending,
    task,
    title,
    toggleTask,
  };
}
