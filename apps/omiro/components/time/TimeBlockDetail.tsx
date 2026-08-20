import DateTimePicker from '@expo/ui/community/datetime-picker';
import { Stack } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Text } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { TaskPeoplePicker } from '~/components/tasks/TaskPeoplePicker';
import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';
import { LocationSearchField } from '~/components/time/LocationSearchField';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import { TextField } from '~/components/ui/text-field';
import type { CalendarEventPatch, CalendarRecurrenceScope } from '~/modules/on-device-ai';
import {
  useCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from '~/services/calendar/calendar-queries';
import { formatClockTime } from '~/services/date/format-date';
import type { PersonPickerRecord } from '~/services/people/use-people';
import { useTaskComplete } from '~/services/tasks/use-task-complete';
import { useTaskDelete } from '~/services/tasks/use-task-delete';
import { useTaskQuery } from '~/services/tasks/use-task-query';
import { useTaskUpdate } from '~/services/tasks/use-task-update';

export type TimeBlockDetailSource = 'task' | 'event';
type ActiveField = 'location' | 'notes' | 'people' | 'time' | 'title' | null;

function formatInterval(start: Date, end: Date) {
  return `${start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · ${formatClockTime(start)}–${formatClockTime(end)}`;
}

function FieldCard({
  align = 'center',
  children,
  icon,
  iconColor,
  label,
  onPress,
  testID,
}: {
  align?: 'center' | 'flex-start';
  children: React.ReactNode;
  icon: SFSymbol;
  iconColor: string;
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      style={({ pressed }) => [styles.s0, { alignItems: align }, pressed && { opacity: 0.7 }]}
      testID={testID}
    >
      <View style={[styles.s1, { backgroundColor: iconColor }]}>
        <AppIcon name={icon} size={18} tintColor="#ffffff" />
      </View>
      <View style={styles.s2}>{children}</View>
    </Pressable>
  );
}

export function TimeBlockDetail({
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
  return source === 'task' ? (
    <TaskDetailEditor id={id} initialActiveField={initialActiveField} onClose={onClose} />
  ) : (
    <CalendarEventDetailEditor id={id} initialActiveField={initialActiveField} onClose={onClose} />
  );
}

function TaskDetailEditor({
  id,
  initialActiveField = null,
  onClose,
}: {
  id: string;
  initialActiveField?: ActiveField;
  onClose: () => void;
}) {
  return (
    <TimeBlockEditor
      id={id}
      initialActiveField={initialActiveField}
      onClose={onClose}
      source="task"
    />
  );
}

function CalendarEventDetailEditor({
  id,
  initialActiveField = null,
  onClose,
}: {
  id: string;
  initialActiveField?: ActiveField;
  onClose: () => void;
}) {
  return (
    <TimeBlockEditor
      id={id}
      initialActiveField={initialActiveField}
      onClose={onClose}
      source="event"
    />
  );
}

function TimeBlockEditor({
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
  const taskQuery = useTaskQuery({ taskId: id, enabled: source === 'task' });
  const { mutateAsync: updateTask, isPending: isSavingTask } = useTaskUpdate();
  const { mutateAsync: deleteTask } = useTaskDelete();
  const { mutate: toggleTask, isPending: isTogglingTask } = useTaskComplete();
  const eventQuery = useCalendarEvent({ enabled: source === 'event', id });
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();
  const [eventError, setEventError] = useState('');
  const [draftDuration, setDraftDuration] = useState('');
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftLocation, setDraftLocation] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftPeople, setDraftPeople] = useState<PersonPickerRecord[]>([]);
  const [activeField, setActiveField] = useState<ActiveField>(initialActiveField);
  const [isScheduling, setIsScheduling] = useState(false);
  const initializedBlockKeyRef = useRef<string | null>(null);
  const [chartBlue, chartPurple, chartTeal, chartOrange, chartGray] = useThemeColor([
    '--color-chart-1',
    '--color-chart-2',
    '--color-chart-3',
    '--color-chart-4',
    '--color-chart-5',
  ]) as string[];

  const task = taskQuery.data?.task;
  const isTask = source === 'task';
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
      taskQuery.data?.participants.map((person) => ({
        id: person.personId,
        displayName: person.displayName,
        email: person.email,
      })) ?? [],
    );
    setDraftStart(start ? new Date(start) : defaultStart);
    setDraftTitle(title);
    setIsScheduling(Boolean(start && end) || (isTask && initialActiveField === 'time'));
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
    initialActiveField,
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

  if (isLoading) {
    return (
      <View style={styles.s3}>
        <Text style={styles.s4}>Loading time block…</Text>
      </View>
    );
  }

  if (!block || error) {
    return (
      <View style={styles.s5}>
        <Text style={styles.s6}>{error || 'This time block is unavailable.'}</Text>
        <Button label="Close" onPress={onClose} variant="secondary" />
      </View>
    );
  }

  const readOnlyEvent = !isTask && !event?.isEditable;
  const saving = isSavingTask || updateEvent.isPending;
  const intentColor = isTask ? chartTeal : chartBlue;

  return (
    <>
      {!readOnlyEvent ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu accessibilityLabel="Time block actions" icon="ellipsis.circle">
            <Stack.Toolbar.MenuAction destructive icon="trash" onPress={remove}>
              Delete
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      ) : null}
      <View style={styles.s7} testID="time-block-editor">
        <ScrollView
          contentContainerStyle={{ gap: 16, padding: 16 }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          style={styles.s8}
        >
          <View style={styles.s9}>
            <View style={[styles.s10, { backgroundColor: intentColor }]}>
              <AppIcon
                name={isTask ? 'checkmark.circle.fill' : 'calendar'}
                size={12}
                tintColor="#ffffff"
              />
              <Text style={[styles.s11, { color: '#ffffff' }]}>
                {isTask ? 'Task' : (event?.calendarTitle ?? 'Event')}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Edit title"
              disabled={readOnlyEvent}
              onPress={() => setActiveField('title')}
              testID="time-block-edit-title"
            >
              {activeField === 'title' ? (
                <TextField
                  autoFocus
                  onChangeText={setDraftTitle}
                  style={{ fontSize: 26, fontWeight: '700', paddingHorizontal: 0 }}
                  testID="time-block-title"
                  value={draftTitle}
                />
              ) : (
                <Text style={styles.s12}>{draftTitle}</Text>
              )}
            </Pressable>
            {isTask && task?.status === 'completed' ? (
              <Text style={styles.s13}>Completed</Text>
            ) : null}
            {readOnlyEvent ? (
              <Text style={styles.s14}>This calendar is read-only in Omiro.</Text>
            ) : null}
          </View>

          <View style={styles.s15}>
            <FieldCard
              align={activeField === 'time' ? 'flex-start' : 'center'}
              icon="clock.fill"
              iconColor={chartBlue}
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
                <View style={styles.s16}>
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
                <Text style={styles.s17}>{formatInterval(draftStart, draftEnd)}</Text>
              ) : (
                <Text style={styles.s18}>Set a time</Text>
              )}
            </FieldCard>
            <FieldCard
              align={activeField === 'location' ? 'flex-start' : 'center'}
              icon="mappin.and.ellipse"
              iconColor={chartTeal}
              label="Location"
              onPress={readOnlyEvent ? undefined : () => setActiveField('location')}
              testID="time-block-edit-location"
            >
              {activeField === 'location' ? (
                <LocationSearchField
                  onChange={setDraftLocation}
                  testID="time-block-location"
                  value={draftLocation}
                />
              ) : (
                <Text
                  style={[styles.s20, draftLocation ? styles.foreground : styles.mutedForeground]}
                >
                  {draftLocation || 'Add location'}
                </Text>
              )}
            </FieldCard>
            <FieldCard
              align={activeField === 'notes' ? 'flex-start' : 'center'}
              icon="note.text"
              iconColor={chartOrange}
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
                <Text style={[styles.s20, draftNotes ? styles.foreground : styles.mutedForeground]}>
                  {draftNotes || 'Add notes'}
                </Text>
              )}
            </FieldCard>
            {isTask ? (
              <FieldCard
                align={activeField === 'people' ? 'flex-start' : 'center'}
                icon="person.2.fill"
                iconColor={chartPurple}
                label="People"
                onPress={() => setActiveField('people')}
                testID="time-block-edit-people"
              >
                {activeField === 'people' ? (
                  <TaskPeoplePicker selected={draftPeople} onChange={setDraftPeople} />
                ) : (
                  <Text
                    style={[
                      styles.s20,
                      draftPeople.length > 0 ? styles.foreground : styles.mutedForeground,
                    ]}
                  >
                    {draftPeople.map((person) => person.displayName).join(', ') || 'Add people'}
                  </Text>
                )}
              </FieldCard>
            ) : null}
            {!isTask && event?.participants.length ? (
              <FieldCard icon="person.2.fill" iconColor={chartPurple} label="People">
                <Text style={styles.s19}>{event.participants.join(', ')}</Text>
              </FieldCard>
            ) : null}
            {!isTask && event?.recurrenceDescription ? (
              <FieldCard icon="arrow.triangle.2.circlepath" iconColor={chartGray} label="Repeats">
                <Text style={styles.s20}>Recurring event</Text>
              </FieldCard>
            ) : null}
          </View>
        </ScrollView>
        {!readOnlyEvent && (isDirty || isTask) ? (
          <KeyboardStickyView>
            <View style={styles.s21}>
              <View style={styles.s22}>
                {isTask ? (
                  <Button
                    disabled={isTogglingTask}
                    label={task?.status === 'completed' ? 'Reopen' : 'Complete'}
                    onPress={() =>
                      task &&
                      toggleTask({ taskId: task.id, completed: task.status !== 'completed' })
                    }
                    style={{ borderRadius: 999 }}
                    testID="time-block-complete"
                    variant="secondary"
                  />
                ) : null}
                <Button
                  label="Save changes"
                  loading={saving}
                  onPress={() => void saveChanges()}
                  style={{ borderRadius: 999 }}
                  testID="time-block-save"
                />
              </View>
            </View>
          </KeyboardStickyView>
        ) : null}
      </View>
    </>
  );
}

const styles = makeStyles((theme) => ({
  s0: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  s1: { height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  s2: { flex: 1, gap: 4 },
  s3: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16 },
  s4: { color: theme.colors.mutedForeground },
  s5: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16 },
  s6: { color: theme.colors.destructive },
  s7: { flex: 1 },
  s8: { flex: 1 },
  s9: { gap: 12 },
  s10: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  s11: { ...theme.typography.caption1, fontWeight: '600' },
  s12: { ...theme.typography.display },
  s13: { color: theme.colors.mutedForeground },
  s14: { color: theme.colors.mutedForeground },
  s15: { gap: 10 },
  s16: { gap: 8 },
  s17: { ...theme.typography.body },
  s18: { ...theme.typography.body, color: theme.colors.mutedForeground },
  s19: { ...theme.typography.body },
  s20: { ...theme.typography.body },
  s21: {
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  s22: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  foreground: { color: theme.colors.foreground },
  mutedForeground: { color: theme.colors.mutedForeground },
}));
