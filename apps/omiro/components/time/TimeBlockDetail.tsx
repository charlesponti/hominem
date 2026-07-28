import DateTimePicker from '@expo/ui/community/datetime-picker';
import { GlassView } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, Text } from '~/components/theme';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import { Input } from '~/components/ui/input';
import type {
  CalendarEvent,
  CalendarEventPatch,
  CalendarRecurrenceScope,
} from '~/modules/on-device-ai';
import { useTaskComplete } from '~/services/tasks/use-task-complete';
import { useTaskDelete } from '~/services/tasks/use-task-delete';
import { useTaskQuery } from '~/services/tasks/use-task-query';
import { useTaskUpdate } from '~/services/tasks/use-task-update';

import { timeEventGateway } from './time-event-gateway';

export type TimeBlockDetailSource = 'task' | 'event';

type EditableField = 'title' | 'location' | 'notes' | 'people' | 'time' | 'duration';

function formatInterval(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })} · ${startDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })} – ${endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function DetailRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const styles = useStyles();
  const content = (
    <>
      <Text variant="subhead" color="text-secondary">
        {label}
      </Text>
      <View style={styles.detailValue}>
        <Text
          numberOfLines={label === 'Location' ? 1 : undefined}
          variant="body"
          color="text-primary"
        >
          {value}
        </Text>
        {onPress ? <AppIcon name="chevron.right" size={14} /> : null}
      </View>
    </>
  );

  return onPress ? (
    <Pressable accessibilityLabel={`Edit ${label}`} onPress={onPress} style={styles.detailRow}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.detailRow}>{content}</View>
  );
}

export function TimeBlockDetail({ id, source }: { id: string; source: TimeBlockDetailSource }) {
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const taskQuery = useTaskQuery({ taskId: id, enabled: source === 'task' });
  const { mutateAsync: updateTask, isPending: isSavingTask } = useTaskUpdate();
  const { mutateAsync: deleteTask, isPending: isDeletingTask } = useTaskDelete();
  const { mutate: toggleTask } = useTaskComplete();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [eventError, setEventError] = useState('');
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  const task = taskQuery.data?.task;
  const isTask = source === 'task';
  const block = isTask ? task : event;
  const isLoading = isTask ? taskQuery.isLoading : event === null && !eventError;
  const error = isTask
    ? taskQuery.error instanceof Error
      ? taskQuery.error.message
      : ''
    : eventError;
  const title = block?.title ?? 'Time block';
  const location = block?.location ?? null;
  const notes = isTask ? (task?.description ?? null) : (event?.notes ?? null);
  const interval = useMemo(() => {
    if (isTask) {
      if (!task?.scheduledStartAt || !task.scheduledEndAt) return 'Unscheduled';
      return formatInterval(task.scheduledStartAt, task.scheduledEndAt);
    }
    return event ? formatInterval(event.startDate, event.endDate) : '';
  }, [event, isTask, task?.scheduledEndAt, task?.scheduledStartAt]);

  useEffect(() => {
    if (source !== 'event') return;
    let mounted = true;
    void timeEventGateway
      .getEvent(id)
      .then((nextEvent) => {
        if (mounted) setEvent(nextEvent);
      })
      .catch((loadError) => {
        if (mounted) {
          setEventError(
            loadError instanceof Error ? loadError.message : 'Unable to load this calendar event.',
          );
        }
      });
    return () => {
      mounted = false;
    };
  }, [id, source]);

  const beginEdit = useCallback(
    (field: EditableField) => {
      setEditingField(field);
      if (field === 'time') {
        const start = isTask ? task?.scheduledStartAt : event?.startDate;
        const end = isTask ? task?.scheduledEndAt : event?.endDate;
        const defaultStart = new Date();
        setDraftStart(start ? new Date(start) : defaultStart);
        setDraftEnd(end ? new Date(end) : new Date(defaultStart.getTime() + 60 * 60 * 1000));
        return;
      }
      if (field === 'duration') {
        const start = isTask ? task?.scheduledStartAt : event?.startDate;
        const end = isTask ? task?.scheduledEndAt : event?.endDate;
        const duration = isTask
          ? task?.durationMinutes
          : start && end
            ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000)
            : null;
        setEditValue(duration ? String(duration) : '');
        return;
      }
      setEditValue(
        field === 'title'
          ? title
          : field === 'location'
            ? (location ?? '')
            : field === 'people'
              ? (taskQuery.data?.participants.map((person) => person.displayName).join('\n') ?? '')
              : (notes ?? ''),
      );
    },
    [
      event?.endDate,
      event?.startDate,
      isTask,
      location,
      notes,
      task?.scheduledEndAt,
      task?.scheduledStartAt,
      taskQuery.data?.participants,
      title,
    ],
  );

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
      new Promise<void>((resolve) => {
        withRecurrenceScope((scope) => {
          setIsSavingEvent(true);
          void timeEventGateway
            .updateEvent(id, patch, scope)
            .then((updated) => {
              setEvent(updated);
              setEditingField(null);
              setEventError('');
            })
            .catch((saveError) =>
              setEventError(
                saveError instanceof Error ? saveError.message : 'Unable to save this change.',
              ),
            )
            .finally(() => {
              setIsSavingEvent(false);
              resolve();
            });
        }, resolve);
      }),
    [id, withRecurrenceScope],
  );

  const saveField = useCallback(async () => {
    if (!editingField) return;
    if (editingField === 'duration') {
      const durationMinutes = Number(editValue);
      if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
        setEventError('Duration must be a positive number of minutes.');
        return;
      }
      try {
        if (isTask) {
          await updateTask({ taskId: id, durationMinutes });
        } else if (event) {
          await saveEventPatch({
            endDate: new Date(
              new Date(event.startDate).getTime() + durationMinutes * 60_000,
            ).toISOString(),
          });
          return;
        }
        setEditingField(null);
        setEventError('');
      } catch (saveError) {
        setEventError(
          saveError instanceof Error ? saveError.message : 'Unable to save this change.',
        );
      }
      return;
    }
    if (editingField === 'time') {
      if (!draftStart || !draftEnd || draftEnd <= draftStart) {
        setEventError('End time must be after start time.');
        return;
      }
      try {
        if (isTask) {
          await updateTask({
            taskId: id,
            scheduledStartAt: draftStart.toISOString(),
            scheduledEndAt: draftEnd.toISOString(),
          });
          setEditingField(null);
        } else {
          await saveEventPatch({
            startDate: draftStart.toISOString(),
            endDate: draftEnd.toISOString(),
          });
        }
        setEventError('');
      } catch (saveError) {
        setEventError(
          saveError instanceof Error ? saveError.message : 'Unable to save this change.',
        );
      }
      return;
    }
    const value = editValue.trim() || null;
    try {
      if (isTask) {
        await updateTask({
          taskId: id,
          ...(editingField === 'title' ? { title: value ?? title } : {}),
          ...(editingField === 'location' ? { location: value } : {}),
          ...(editingField === 'notes' ? { description: value } : {}),
          ...(editingField === 'people'
            ? {
                participants: editValue
                  .split('\n')
                  .map((person) => person.trim())
                  .filter(Boolean)
                  .map((displayName) => ({ displayName })),
              }
            : {}),
        });
        if (editingField === 'people') {
          await taskQuery.refetch();
        }
      } else {
        const patch: CalendarEventPatch =
          editingField === 'title'
            ? { title: value ?? title }
            : editingField === 'location'
              ? { location: value }
              : { notes: value };
        await saveEventPatch(patch);
        return;
      }
      setEditingField(null);
      setEventError('');
    } catch (saveError) {
      setEventError(saveError instanceof Error ? saveError.message : 'Unable to save this change.');
    }
  }, [
    draftEnd,
    draftStart,
    editValue,
    editingField,
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
        void deleteTask(id).then(() => router.back());
        return;
      }
      withRecurrenceScope((scope) => {
        void timeEventGateway
          .deleteEvent(id, scope)
          .then(() => router.back())
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
  }, [deleteTask, id, isTask, router, title, withRecurrenceScope]);

  const goBack = useCallback(() => {
    if (!editingField) {
      router.back();
      return;
    }
    Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [editingField, router]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text color="text-secondary">Loading time block…</Text>
      </View>
    );
  }

  if (!block || error) {
    return (
      <View style={styles.centered}>
        <Text color="destructive">{error || 'This time block is unavailable.'}</Text>
        <Button label="Go back" onPress={() => router.back()} variant="secondary" />
      </View>
    );
  }

  const readOnlyEvent = !isTask && !event?.isEditable;
  const saving = isSavingTask || isSavingEvent;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.titleActions}>
          {isTask ? (
            <Button
              label={task?.status === 'completed' ? 'Reopen' : 'Complete'}
              onPress={() =>
                task && toggleTask({ taskId: task.id, completed: task.status !== 'completed' })
              }
              size="sm"
              variant="secondary"
            />
          ) : null}
        </View>

        <Pressable
          accessibilityLabel="Edit title"
          disabled={readOnlyEvent}
          onPress={() => beginEdit('title')}
        >
          <Text variant="title1" color="text-primary">
            {title}
          </Text>
        </Pressable>
        {isTask && task?.status === 'completed' ? (
          <Text color="text-secondary">Completed</Text>
        ) : null}
        {readOnlyEvent ? (
          <Text color="text-secondary">This calendar is read-only in Omiro.</Text>
        ) : null}

        {editingField ? (
          <View style={styles.editForm}>
            {editingField === 'time' && draftStart && draftEnd ? (
              <>
                <Text color="text-secondary">Starts</Text>
                <DateTimePicker
                  display="compact"
                  mode="datetime"
                  onValueChange={(_, date) => setDraftStart(date)}
                  testID="time-block-start-picker"
                  value={draftStart}
                />
                <Text color="text-secondary">Ends</Text>
                <DateTimePicker
                  display="compact"
                  minimumDate={draftStart}
                  mode="datetime"
                  onValueChange={(_, date) => setDraftEnd(date)}
                  testID="time-block-end-picker"
                  value={draftEnd}
                />
              </>
            ) : (
              <Input
                autoFocus
                keyboardType={editingField === 'duration' ? 'number-pad' : 'default'}
                multiline={editingField === 'notes'}
                onChangeText={setEditValue}
                placeholder={
                  editingField === 'people' ? 'One person per line' : `Edit ${editingField}`
                }
                value={editValue}
              />
            )}
            <Button label="Save" loading={saving} onPress={() => void saveField()} />
            <Button
              label="Cancel"
              onPress={() => setEditingField(null)}
              size="sm"
              variant="ghost"
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <DetailRow
            label="Time"
            value={interval}
            onPress={readOnlyEvent ? undefined : () => beginEdit('time')}
          />
          <DetailRow
            label="Duration"
            value={
              isTask
                ? task?.durationMinutes
                  ? `${task.durationMinutes} min`
                  : 'Add duration'
                : event
                  ? `${Math.round((new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / 60_000)} min`
                  : ''
            }
            onPress={readOnlyEvent ? undefined : () => beginEdit('duration')}
          />
          {isTask && (task?.schedulingWindowStartAt || task?.schedulingWindowEndAt) ? (
            <DetailRow
              label="Scheduling window"
              value={`${task.schedulingWindowStartAt ? new Date(task.schedulingWindowStartAt).toLocaleString() : 'Any time'} – ${task.schedulingWindowEndAt ? new Date(task.schedulingWindowEndAt).toLocaleString() : 'No deadline'}`}
            />
          ) : null}
          <DetailRow
            label="Location"
            value={location ?? 'Add location'}
            onPress={readOnlyEvent ? undefined : () => beginEdit('location')}
          />
          <DetailRow
            label="Notes"
            value={notes ?? 'Add notes'}
            onPress={readOnlyEvent ? undefined : () => beginEdit('notes')}
          />
          <DetailRow
            label="Source"
            value={isTask ? 'Omiro' : (event?.calendarTitle ?? 'iOS Calendar')}
          />
          {!isTask && event?.participants.length ? (
            <DetailRow label="People" value={event.participants.join(', ')} />
          ) : null}
          {isTask ? (
            <DetailRow
              label="People"
              value={
                taskQuery.data?.participants.map((person) => person.displayName).join(', ') ||
                'Add people'
              }
              onPress={() => beginEdit('people')}
            />
          ) : null}
          {!isTask && event?.recurrenceDescription ? (
            <DetailRow label="Repeats" value="Recurring event" />
          ) : null}
        </View>

        {isTask ? (
          <Button
            label={task?.scheduledStartAt ? 'Unschedule' : 'Schedule'}
            loading={saving}
            onPress={() =>
              task?.scheduledStartAt
                ? void updateTask({ taskId: id, scheduledStartAt: null, scheduledEndAt: null })
                : beginEdit('time')
            }
            testID={task?.scheduledStartAt ? 'time-block-unschedule' : 'time-block-schedule'}
            variant="secondary"
          />
        ) : null}
        {!readOnlyEvent ? (
          <Button label="Delete" loading={isDeletingTask} onPress={remove} variant="destructive" />
        ) : null}
      </ScrollView>
      <GlassView
        glassEffectStyle="regular"
        isInteractive
        style={[styles.backButton, { top: insets.top + 8 }]}
      >
        <Pressable
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={goBack}
          style={styles.backPressable}
          testID="time-block-back"
        >
          <AppIcon name="chevron.left" size={18} />
        </Pressable>
      </GlassView>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.lg,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  backButton: {
    borderRadius: 22,
    left: theme.spacing.lg,
    overflow: 'hidden',
    position: 'absolute',
  },
  backPressable: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  detailRow: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  detailValue: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  editForm: {
    gap: theme.spacing.sm,
  },
  section: {
    gap: theme.spacing.sm,
  },
  screen: {
    flex: 1,
  },
  titleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
}));
