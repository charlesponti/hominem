import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Pressable, ScrollView, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { makeStyles, Text } from '~/components/theme';
import { Button } from '~/components/ui/button';
import { IconButton } from '~/components/ui/icon-button';
import { TextField } from '~/components/ui/text-field';
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
type ActiveField = 'location' | 'notes' | 'people' | 'time' | 'title' | null;

function formatInterval(start: Date, end: Date) {
  return `${start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · ${start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}–${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function DetailBlock({
  children,
  label,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  const styles = useStyles();
  const content = (
    <>
      <Text color="text-secondary" variant="overline">
        {label}
      </Text>
      {children}
    </>
  );

  return (
    <Pressable
      accessibilityLabel={`Edit ${label}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.detailBlock, pressed && styles.pressed]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

export function TimeBlockDetail({
  id,
  source,
  onClose,
}: {
  id: string;
  source: TimeBlockDetailSource;
  onClose: () => void;
}) {
  const styles = useStyles();
  const taskQuery = useTaskQuery({ taskId: id, enabled: source === 'task' });
  const { mutateAsync: updateTask, isPending: isSavingTask } = useTaskUpdate();
  const { mutateAsync: deleteTask } = useTaskDelete();
  const { mutate: toggleTask } = useTaskComplete();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [eventError, setEventError] = useState('');
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [draftDuration, setDraftDuration] = useState('');
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftLocation, setDraftLocation] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftPeople, setDraftPeople] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [isScheduling, setIsScheduling] = useState(false);

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
  const originalPeople =
    taskQuery.data?.participants.map((person) => person.displayName).join('\n') ?? '';
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

  useEffect(() => {
    if (!block) return;
    const start = isTask ? task?.scheduledStartAt : event?.startDate;
    const end = isTask ? task?.scheduledEndAt : event?.endDate;
    const duration = isTask
      ? task?.durationMinutes
      : start && end
        ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000)
        : null;
    const defaultStart = new Date();
    setDraftDuration(duration ? String(duration) : '');
    setDraftEnd(end ? new Date(end) : new Date(defaultStart.getTime() + 60 * 60 * 1000));
    setDraftLocation(location ?? '');
    setDraftNotes(notes ?? '');
    setDraftPeople(
      taskQuery.data?.participants.map((person) => person.displayName).join('\n') ?? '',
    );
    setDraftStart(start ? new Date(start) : defaultStart);
    setDraftTitle(title);
    setIsScheduling(Boolean(start && end));
  }, [
    block,
    event?.endDate,
    event?.startDate,
    isTask,
    location,
    notes,
    task?.durationMinutes,
    task?.scheduledEndAt,
    task?.scheduledStartAt,
    taskQuery.data?.participants,
    title,
  ]);

  const isDirty = useMemo(() => {
    const start = isTask ? task?.scheduledStartAt : event?.startDate;
    const end = isTask ? task?.scheduledEndAt : event?.endDate;
    const duration = isTask
      ? task?.durationMinutes
      : start && end
        ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000)
        : null;
    return (
      draftDuration !== (duration ? String(duration) : '') ||
      draftEnd?.toISOString() !== (end ? new Date(end).toISOString() : undefined) ||
      draftLocation !== (location ?? '') ||
      draftNotes !== (notes ?? '') ||
      draftPeople !== originalPeople ||
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
            setIsSavingEvent(true);
            void timeEventGateway
              .updateEvent(id, patch, scope)
              .then(() => timeEventGateway.getEvent(id))
              .then((persistedEvent) => {
                setEvent(persistedEvent);
                setEventError('');
                resolve(true);
              })
              .catch(reject)
              .finally(() => {
                setIsSavingEvent(false);
              });
          },
          () => resolve(false),
        );
      }),
    [id, withRecurrenceScope],
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
          participants: draftPeople
            .split('\n')
            .map((person) => person.trim())
            .filter(Boolean)
            .map((displayName) => ({ displayName })),
          scheduledEndAt: isScheduling ? draftEnd.toISOString() : null,
          scheduledStartAt: isScheduling ? draftStart.toISOString() : null,
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
    event,
    id,
    isTask,
    isScheduling,
    saveEventPatch,
    task?.scheduledEndAt,
    taskQuery,
    title,
    updateTask,
  ]);

  const remove = useCallback(() => {
    const confirm = () => {
      if (isTask) {
        void deleteTask(id).then(onClose);
        return;
      }
      withRecurrenceScope((scope) => {
        void timeEventGateway
          .deleteEvent(id, scope)
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
  }, [deleteTask, id, isTask, onClose, title, withRecurrenceScope]);

  const showActions = useCallback(() => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        cancelButtonIndex: 0,
        destructiveButtonIndex: 1,
        options: ['Cancel', 'Delete'],
      },
      (index) => {
        if (index === 1) remove();
      },
    );
  }, [remove]);

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
        <Button label="Close" onPress={onClose} variant="secondary" />
      </View>
    );
  }

  const readOnlyEvent = !isTask && !event?.isEditable;
  const saving = isSavingTask || isSavingEvent;

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen} testID="time-block-editor">
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
      >
        <View style={styles.header}>
          <View style={styles.headerActions}>
            {isTask ? (
              <Button
                label={task?.status === 'completed' ? 'Reopen' : 'Complete'}
                onPress={() =>
                  task && toggleTask({ taskId: task.id, completed: task.status !== 'completed' })
                }
                size="sm"
                variant="ghost"
              />
            ) : null}
            {!readOnlyEvent ? (
              <IconButton accessibilityLabel="More actions" icon="ellipsis" onPress={showActions} />
            ) : null}
          </View>
          <DetailBlock
            label={isTask ? 'Task' : (event?.calendarTitle ?? 'Calendar')}
            onPress={() => setActiveField('title')}
            testID="time-block-edit-title"
          >
            {activeField === 'title' ? (
              <TextField
                autoFocus
                onChangeText={setDraftTitle}
                testID="time-block-title"
                value={draftTitle}
              />
            ) : (
              <Text variant="display">{draftTitle}</Text>
            )}
          </DetailBlock>
          {isTask && task?.status === 'completed' ? (
            <Text color="text-secondary">Completed</Text>
          ) : null}
          {readOnlyEvent ? (
            <Text color="text-secondary">This calendar is read-only in Omiro.</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <DetailBlock
            label="When"
            onPress={
              readOnlyEvent
                ? undefined
                : () => {
                    if (isTask && !isScheduling) setIsScheduling(true);
                    setActiveField('time');
                  }
            }
            testID="time-block-edit-time"
          >
            {activeField === 'time' && draftStart && draftEnd ? (
              <View style={styles.timeEditor}>
                <DateTimePicker
                  display="compact"
                  mode="datetime"
                  onValueChange={(_, date) => setDraftStart(date)}
                  testID="time-block-start-picker"
                  value={draftStart}
                />
                <DateTimePicker
                  display="compact"
                  minimumDate={draftStart}
                  mode="datetime"
                  onValueChange={(_, date) => setDraftEnd(date)}
                  testID="time-block-end-picker"
                  value={draftEnd}
                />
                <TextField
                  keyboardType="number-pad"
                  onChangeText={setDraftDuration}
                  placeholder="Duration in minutes"
                  testID="time-block-duration"
                  value={draftDuration}
                />
              </View>
            ) : draftStart && draftEnd ? (
              <Text variant="title2">{formatInterval(draftStart, draftEnd)}</Text>
            ) : (
              <Text color="text-secondary">Set a time</Text>
            )}
          </DetailBlock>
          <DetailBlock
            label="Location"
            onPress={readOnlyEvent ? undefined : () => setActiveField('location')}
            testID="time-block-edit-location"
          >
            {activeField === 'location' ? (
              <TextField
                autoFocus
                onChangeText={setDraftLocation}
                placeholder="Add location"
                testID="time-block-location"
                value={draftLocation}
              />
            ) : (
              <Text color={draftLocation ? 'text-primary' : 'text-secondary'}>
                {draftLocation || 'Add location'}
              </Text>
            )}
          </DetailBlock>
          <DetailBlock
            label="Notes"
            onPress={readOnlyEvent ? undefined : () => setActiveField('notes')}
            testID="time-block-edit-notes"
          >
            {activeField === 'notes' ? (
              <TextField
                autoFocus
                multiline
                onChangeText={setDraftNotes}
                placeholder="Add notes"
                testID="time-block-notes"
                value={draftNotes}
              />
            ) : (
              <Text color={draftNotes ? 'text-primary' : 'text-secondary'}>
                {draftNotes || 'Add notes'}
              </Text>
            )}
          </DetailBlock>
          {isTask ? (
            <DetailBlock
              label="People"
              onPress={() => setActiveField('people')}
              testID="time-block-edit-people"
            >
              {activeField === 'people' ? (
                <TextField
                  autoFocus
                  multiline
                  onChangeText={setDraftPeople}
                  placeholder="One person per line"
                  testID="time-block-people"
                  value={draftPeople}
                />
              ) : (
                <Text color={draftPeople ? 'text-primary' : 'text-secondary'}>
                  {draftPeople || 'Add people'}
                </Text>
              )}
            </DetailBlock>
          ) : null}
          {!isTask && event?.participants.length ? (
            <DetailBlock label="People">
              <Text>{event.participants.join(', ')}</Text>
            </DetailBlock>
          ) : null}
          {!isTask && event?.recurrenceDescription ? (
            <DetailBlock label="Repeats">
              <Text>Recurring event</Text>
            </DetailBlock>
          ) : null}
        </View>
      </ScrollView>
      {!readOnlyEvent && isDirty ? (
        <View style={styles.actions}>
          <Button
            label="Save changes"
            loading={saving}
            onPress={() => void saveChanges()}
            testID="time-block-save"
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((theme) => ({
  actions: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors['border-default'],
    borderTopWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.lg,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  detailBlock: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  header: {
    gap: theme.spacing.md,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    gap: theme.spacing.sm,
  },
  screen: {
    flex: 1,
  },
  scroll: { flex: 1 },
  timeEditor: {
    gap: theme.spacing.sm,
  },
}));
