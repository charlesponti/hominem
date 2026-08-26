import DateTimePicker from '@expo/ui/community/datetime-picker';
import { Stack } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { TaskPeoplePicker } from '~/components/tasks/TaskPeoplePicker';
import { makeStyles, useThemeColor } from '~/components/theme';
import { LocationSearchField } from '~/components/time/LocationSearchField';
import type {
  ActiveField,
  TimeBlockDetailSource,
} from '~/components/time/use-time-block-editor-state';
import { useTimeBlockEditorState } from '~/components/time/use-time-block-editor-state';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import { TextField } from '~/components/ui/text-field';
import { formatClockTime } from '~/services/date/format-date';

export type { TimeBlockDetailSource } from '~/components/time/use-time-block-editor-state';

function formatInterval(start: Date, end: Date) {
  return `${start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · ${formatClockTime(start)}–${formatClockTime(end)}`;
}

function FieldCard({
  align = 'center',
  children,
  icon,
  iconColor,
  label,
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
      style={({ pressed }) => [
        styles.fieldCard,
        { alignItems: align },
        pressed && { opacity: 0.7 },
      ]}
      testID={testID}
    >
      <View style={[styles.fieldIcon, { backgroundColor: iconColor }]}>
        <AppIcon name={icon} size={18} tintColor="#ffffff" />
      </View>
      <View style={styles.fieldContent}>{children}</View>
    </Pressable>
  );
}

// react-doctor-disable-next-line no-giant-component -- task and event editing share one controlled iOS surface and lifecycle.
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
  const {
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
    isSchedulingRef,
    isTask,
    isTogglingTask,
    remove,
    saveChanges,
    saving,
    task,
    title,
    toggleTask,
  } = useTimeBlockEditorState({ id, initialActiveField, onClose, source });
  const [chartBlue, chartPurple, chartTeal, chartOrange, chartGray] = useThemeColor([
    '--color-chart-1',
    '--color-chart-2',
    '--color-chart-3',
    '--color-chart-4',
    '--color-chart-5',
  ]) as string[];

  if (isLoading) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.loadingText}>Loading time block…</Text>
      </View>
    );
  }

  if (!block || error) {
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorText}>{error || 'This time block is unavailable.'}</Text>
        <Button label="Close" onPress={onClose} variant="secondary" />
      </View>
    );
  }

  const readOnlyEvent = !isTask && !event?.isEditable;
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
      <View style={styles.editor} testID="time-block-editor">
        <ScrollView
          contentContainerStyle={{ gap: 16, padding: 16 }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          style={styles.scrollView}
        >
          <View style={styles.header}>
            <View style={[styles.intentBadge, { backgroundColor: intentColor }]}>
              <AppIcon
                name={isTask ? 'checkmark.circle.fill' : 'calendar'}
                size={12}
                tintColor="#ffffff"
              />
              <Text style={[styles.intentLabel, { color: '#ffffff' }]}>
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
                <Text style={styles.title}>{draftTitle}</Text>
              )}
            </Pressable>
            {isTask && task?.status === 'completed' ? (
              <Text style={styles.completedLabel}>Completed</Text>
            ) : null}
            {readOnlyEvent ? (
              <Text style={styles.readOnlyNotice}>This calendar is read-only in Omiro.</Text>
            ) : null}
          </View>

          <View style={styles.fields}>
            <FieldCard
              align={activeField === 'time' ? 'flex-start' : 'center'}
              icon="clock.fill"
              iconColor={chartBlue}
              label="When"
              onPress={
                readOnlyEvent
                  ? undefined
                  : () => {
                      if (isTask) isSchedulingRef.current = true;
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
                <Text style={styles.timeValue}>{formatInterval(draftStart, draftEnd)}</Text>
              ) : (
                <Text style={styles.unsetValue}>Set a time</Text>
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
                  style={[
                    styles.fieldValue,
                    draftLocation ? styles.foreground : styles.mutedForeground,
                  ]}
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
                <Text
                  style={[
                    styles.fieldValue,
                    draftNotes ? styles.foreground : styles.mutedForeground,
                  ]}
                >
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
                      styles.fieldValue,
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
                <Text style={styles.participants}>{event.participants.join(', ')}</Text>
              </FieldCard>
            ) : null}
            {!isTask && event?.recurrenceDescription ? (
              <FieldCard icon="arrow.triangle.2.circlepath" iconColor={chartGray} label="Repeats">
                <Text style={styles.fieldValue}>Recurring event</Text>
              </FieldCard>
            ) : null}
          </View>
        </ScrollView>
        {!readOnlyEvent && (isDirty || isTask) ? (
          <KeyboardStickyView>
            <View style={styles.footer}>
              <View style={styles.footerActions}>
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
  fieldCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldIcon: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  fieldContent: { flex: 1, gap: 4 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16 },
  loadingText: { color: theme.colors.mutedForeground },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16 },
  errorText: { color: theme.colors.destructive },
  editor: { flex: 1 },
  scrollView: { flex: 1 },
  header: { gap: 12 },
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  intentLabel: { ...theme.typography.caption1, fontWeight: '600' },
  title: { ...theme.typography.display },
  completedLabel: { color: theme.colors.mutedForeground },
  readOnlyNotice: { color: theme.colors.mutedForeground },
  fields: { gap: 10 },
  timeEditor: { gap: 8 },
  timeValue: { ...theme.typography.body },
  unsetValue: { ...theme.typography.body, color: theme.colors.mutedForeground },
  participants: { ...theme.typography.body },
  fieldValue: { ...theme.typography.body },
  footer: {
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  footerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  foreground: { color: theme.colors.foreground },
  mutedForeground: { color: theme.colors.mutedForeground },
}));
