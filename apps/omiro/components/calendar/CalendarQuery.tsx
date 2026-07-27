import type { TaskListItem, TasksParseOutput } from '@hominem/rpc/types';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, radii, spacing, Text, useThemeColors } from '~/components/theme';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import { IconButton } from '~/components/ui/icon-button';
import { Input } from '~/components/ui/input';
import OnDeviceAIModule, {
  type CalendarEvent,
  type CalendarPermissionStatus,
} from '~/modules/on-device-ai';
import { getTimeBlockRoute } from '~/services/navigation/routes';
import { useTaskComplete } from '~/services/tasks/use-task-complete';
import { useTaskCreate } from '~/services/tasks/use-task-create';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';
import { useTimeBlockParse } from '~/services/tasks/use-time-block-parse';

const PAGE_DAYS = 30;

type TimelineItem =
  | { kind: 'event'; value: CalendarEvent }
  | { kind: 'task'; value: TaskListItem }
  | { kind: 'section'; id: 'earlier' | 'unscheduled'; count?: number }
  | { kind: 'now' };
type TimelineRowItem = Extract<TimelineItem, { kind: 'event' | 'task' }>;
type TimeBlock = TasksParseOutput['block'];

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function itemDate(item: TimelineItem) {
  if (item.kind === 'section' || item.kind === 'now') return null;
  return item.kind === 'task'
    ? (item.value.scheduledStartAt ?? item.value.dueAt)
    : item.value.startDate;
}

function dayKey(item: TimelineItem) {
  if (item.kind === 'section' || item.kind === 'now') return '';
  const date = new Date(itemDate(item) ?? 0);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(item: TimelineItem) {
  if (item.kind === 'section' || item.kind === 'now') return 'Unscheduled';
  const date = new Date(itemDate(item) ?? 0);
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatEventTime(event: CalendarEvent) {
  if (event.isAllDay) return 'All day';

  return `${new Date(event.startDate).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })} – ${new Date(event.endDate).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function formatTaskTime(task: TaskListItem) {
  const date = task.scheduledStartAt ?? task.dueAt;
  if (!date) return 'Unscheduled';
  return new Date(date).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function TimelineRow({
  item,
  onOpen,
  onToggleTask,
  showDayLabel,
}: {
  item: TimelineRowItem;
  onOpen: () => void;
  onToggleTask: () => void;
  showDayLabel: boolean;
}) {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const isTask = item.kind === 'task';
  const completed = isTask && item.value.status === 'completed';

  return (
    <View>
      {showDayLabel ? (
        <View style={styles.dayHeader}>
          <Text variant="body" color="text-primary">
            {dayLabel(item)}
          </Text>
          <Text variant="caption1" color="text-secondary">
            {new Date(itemDate(item) ?? 0).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      ) : null}
      <View
        testID={isTask ? `calendar-task-${item.value.id}` : 'calendar-event'}
        style={styles.timelineRow}
      >
        <View style={styles.typeIcon}>
          <AppIcon
            name={isTask ? (completed ? 'checkmark.circle.fill' : 'circle') : 'calendar'}
            size={16}
            tintColor={isTask ? themeColors.success : themeColors.primary}
          />
        </View>
        <Pressable
          accessibilityLabel={item.value.title}
          accessibilityRole="button"
          accessibilityState={undefined}
          onPress={onOpen}
          style={styles.itemCopy}
        >
          <Text variant="caption2" color="text-secondary" style={styles.eyebrow}>
            {isTask ? formatTaskTime(item.value) : formatEventTime(item.value)}
          </Text>
          <Text
            variant="body"
            color={completed ? 'tertiary' : 'text-primary'}
            style={completed ? styles.completedTitle : undefined}
          >
            {item.value.title}
          </Text>
          {item.value.location && (
            <Text ellipsizeMode="tail" numberOfLines={1} variant="caption1" color="text-secondary">
              {item.value.location}
            </Text>
          )}
        </Pressable>
        {isTask ? (
          <IconButton
            accessibilityLabel={completed ? 'Mark task incomplete' : 'Mark task complete'}
            icon={completed ? 'checkmark.circle.fill' : 'circle'}
            iconSize={20}
            size={44}
            testID={`calendar-task-toggle-${item.value.id}`}
            tintColor={completed ? themeColors.success : themeColors['tertiary']}
            onPress={onToggleTask}
          />
        ) : null}
      </View>
    </View>
  );
}

interface CalendarResultProps {
  answer: string;
  canSubmitTimeBlock: boolean;
  draftDetails: string;
  draftTitle: string;
  editingField: EditableTimeBlockField | null;
  isAsking: boolean;
  isCreatingTask: boolean;
  isSavingTimeBlock: boolean;
  onCancel: () => void;
  onEdit: (field: EditableTimeBlockField) => void;
  onEditValue: (value: string) => void;
  onSubmit: () => void;
  timeBlock: TimeBlock | null;
}

function CalendarResult({
  answer,
  canSubmitTimeBlock,
  draftDetails,
  draftTitle,
  editingField,
  isAsking,
  isCreatingTask,
  isSavingTimeBlock,
  onCancel,
  onEdit,
  onEditValue,
  onSubmit,
  timeBlock,
}: CalendarResultProps) {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const actionLabel =
    timeBlock?.primary_intent === 'add_task'
      ? 'Add task'
      : timeBlock?.primary_intent === 'add_recurring_event'
        ? 'Add recurring event'
        : 'Add event';

  if (!isAsking && !answer && !timeBlock) return null;

  return (
    <View style={styles.resultSurface} testID="calendar-answer-state">
      {isAsking ? (
        <View
          accessibilityLabel="Looking at your calendar"
          style={styles.thinkingRow}
          testID="calendar-thinking-state"
        >
          <ActivityIndicator color={themeColors.primary} size="small" />
          <Text color="text-secondary">Looking at your calendar…</Text>
        </View>
      ) : null}

      {answer ? (
        <View style={styles.answerRow} testID="calendar-answer-content">
          <View style={styles.answerIcon}>
            <AppIcon name="calendar" size={16} tintColor={themeColors.primary} />
          </View>
          <Text variant="callout" color="text-primary" style={styles.answerCopy}>
            {answer}
          </Text>
        </View>
      ) : null}

      {timeBlock ? (
        <View style={styles.timeBlockContent} testID="time-block-preview">
          <Pressable
            accessibilityLabel="Edit title"
            onPress={() => onEdit('title')}
            testID="time-block-edit-title-trigger"
          >
            <Text variant="headline" color="text-primary">
              {draftTitle}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Edit time details"
            onPress={() => onEdit(timeBlock.duration ? 'duration' : 'location')}
            testID="time-block-edit-details-trigger"
          >
            <Text variant="subhead" color="text-secondary">
              {draftDetails}
            </Text>
          </Pressable>
          {(timeBlock.primary_intent === 'add_event' ||
            timeBlock.primary_intent === 'add_recurring_event') &&
          !canSubmitTimeBlock ? (
            <Text color="destructive">Choose a start and end time before adding this event.</Text>
          ) : null}
          {timeBlock.primary_intent !== 'add_task' &&
          timeBlock.primary_intent !== 'add_event' &&
          timeBlock.primary_intent !== 'add_recurring_event' ? (
            <Text color="text-secondary">Review this request in Time Block details.</Text>
          ) : null}
          {editingField ? (
            <Input
              autoFocus
              accessibilityLabel={`Edit ${editingField}`}
              onChangeText={onEditValue}
              placeholder={
                editingField === 'duration' ? 'Duration in minutes' : `Edit ${editingField}`
              }
              testID={`time-block-edit-${editingField}`}
              value={String(timeBlock[editingField] ?? '')}
            />
          ) : null}
          {canSubmitTimeBlock ? (
            <Button
              label={actionLabel}
              loading={isCreatingTask || isSavingTimeBlock}
              onPress={onSubmit}
              testID="time-block-submit"
            />
          ) : null}
          <Button
            label="Cancel"
            onPress={onCancel}
            size="sm"
            testID="time-block-cancel"
            variant="ghost"
          />
        </View>
      ) : null}
    </View>
  );
}

interface CalendarQueryProps {
  isFocused: boolean;
}

type EditableTimeBlockField =
  | 'title'
  | 'target_title'
  | 'participants'
  | 'location'
  | 'duration'
  | 'start_time'
  | 'end_time'
  | 'scheduling_window_start'
  | 'scheduling_window_end'
  | 'deadline_fixed'
  | 'recurrence_rule';

export function CalendarQuery({ isFocused }: CalendarQueryProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const [prompt, setPrompt] = useState('');
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarPermission, setCalendarPermission] = useState<CalendarPermissionStatus | null>(
    null,
  );
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isSavingTimeBlock, setIsSavingTimeBlock] = useState(false);
  const [timeBlock, setTimeBlock] = useState<TimeBlock | null>(null);
  const [editingField, setEditingField] = useState<EditableTimeBlockField | null>(null);
  const [loadedUntil, setLoadedUntil] = useState(startOfToday());
  const [showEarlier, setShowEarlier] = useState(false);
  const nextStartRef = useRef(startOfToday());
  const loadingEventsRef = useRef(false);
  const { data: tasks = [] } = useTasksQuery({ enabled: isFocused });
  const { mutate: toggleTask } = useTaskComplete();
  const { mutateAsync: createTask, isPending: isCreatingTask } = useTaskCreate();
  const parseTimeBlock = useTimeBlockParse();

  const loadNextPage = useCallback(async () => {
    if (calendarPermission !== 'authorized' || loadingEventsRef.current) return;

    loadingEventsRef.current = true;
    setIsLoadingEvents(true);
    setError('');
    const start = nextStartRef.current;
    const end = new Date(start);
    end.setDate(end.getDate() + PAGE_DAYS);

    try {
      const page = await OnDeviceAIModule.getCalendarEvents(start.toISOString(), end.toISOString());
      setEvents((current) => {
        const existing = new Set(current.map((event) => `${event.id}:${event.startDate}`));
        return [
          ...current,
          ...page.filter((event) => !existing.has(`${event.id}:${event.startDate}`)),
        ];
      });
      nextStartRef.current = end;
      setLoadedUntil(end);
      setHasLoadedEvents(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load calendar events.');
    } finally {
      loadingEventsRef.current = false;
      setIsLoadingEvents(false);
    }
  }, [calendarPermission]);

  useEffect(() => {
    void OnDeviceAIModule.getCalendarPermissions().then(setCalendarPermission);
  }, []);

  useEffect(() => {
    if (calendarPermission !== 'authorized') return;
    const start = startOfToday();
    nextStartRef.current = start;
    setLoadedUntil(start);
    setEvents([]);
    setHasLoadedEvents(false);
    void loadNextPage();
  }, [calendarPermission, loadNextPage]);

  const connect = useCallback(async () => {
    const status = await OnDeviceAIModule.requestCalendarPermissions();
    setCalendarPermission(status);
  }, []);

  const ask = useCallback(async () => {
    const nextPrompt = prompt.trim();
    if (!nextPrompt || isAsking) return;

    setIsAsking(true);
    setSubmittedPrompt(nextPrompt);
    setAnswer('');
    setTimeBlock(null);
    setEditingField(null);
    setError('');
    try {
      const calendarContext = [
        ...events.map((event) => `${event.title} at ${event.startDate}–${event.endDate}`),
        ...tasks
          .filter((task) => task.scheduledStartAt ?? task.dueAt)
          .map((task) => `${task.title} at ${task.scheduledStartAt ?? task.dueAt}`),
      ].join('\n');
      const result = await parseTimeBlock.mutateAsync({
        transcript: nextPrompt,
        calendarContext,
      });
      setTimeBlock(result.block);
      setPrompt('');
      if (result.block.primary_intent === 'search') {
        if (calendarPermission !== 'authorized') {
          setError('Connect your iOS Calendar to search scheduled events.');
          return;
        }
        const answerResult = await OnDeviceAIModule.askCalendar(nextPrompt);
        setAnswer(answerResult.text);
      }
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : 'Unable to answer that question.');
    } finally {
      setIsAsking(false);
    }
  }, [calendarPermission, events, isAsking, parseTimeBlock, prompt, tasks]);

  const submitTimeBlock = useCallback(async () => {
    if (!timeBlock || isCreatingTask || isAsking || isSavingTimeBlock) return;

    const title = timeBlock.title?.trim();
    if (!title) {
      setError('Add a title before saving this time block.');
      return;
    }

    setError('');
    setIsSavingTimeBlock(true);
    try {
      if (timeBlock.primary_intent === 'add_task') {
        await createTask({
          title,
          dueAt: timeBlock.deadline_fixed
            ? new Date(`${timeBlock.deadline_fixed}T23:59:59`).toISOString()
            : null,
          durationMinutes: timeBlock.duration,
          location: timeBlock.location,
          scheduledStartAt: timeBlock.start_time,
          scheduledEndAt: timeBlock.end_time,
          schedulingWindowStartAt: timeBlock.scheduling_window_start,
          schedulingWindowEndAt: timeBlock.scheduling_window_end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } else if (
        timeBlock.primary_intent === 'add_event' ||
        timeBlock.primary_intent === 'add_recurring_event'
      ) {
        if (!timeBlock.start_time || !timeBlock.end_time) {
          setError('Add a start and end time before planning this event.');
          return;
        }
        const event = await OnDeviceAIModule.createCalendarEvent(
          title,
          timeBlock.start_time,
          timeBlock.end_time,
          timeBlock.location,
          timeBlock.recurrence_rule,
        );
        setEvents((current) =>
          [...current, event].sort((a, b) => a.startDate.localeCompare(b.startDate)),
        );
      } else {
        setError('Review this request before making a change.');
        return;
      }

      setSubmittedPrompt('');
      setTimeBlock(null);
      setEditingField(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Unable to save this time block.',
      );
    } finally {
      setIsSavingTimeBlock(false);
    }
  }, [createTask, isAsking, isCreatingTask, isSavingTimeBlock, timeBlock]);

  const draftTitle = timeBlock?.title ?? timeBlock?.target_title ?? submittedPrompt;
  const draftDetails = timeBlock
    ? [
        timeBlock.start_time && timeBlock.end_time
          ? `${new Date(timeBlock.start_time).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })} – ${new Date(timeBlock.end_time).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}`
          : timeBlock.scheduling_window_start
            ? `${new Date(timeBlock.scheduling_window_start).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}${timeBlock.duration ? ` · ${timeBlock.duration} min` : ''}`
            : timeBlock.deadline_fixed
              ? `Due ${new Date(`${timeBlock.deadline_fixed}T12:00:00`).toLocaleDateString(
                  undefined,
                  {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  },
                )}`
              : timeBlock.duration
                ? `Unscheduled · ${timeBlock.duration} min`
                : 'Unscheduled',
        timeBlock.location,
        timeBlock.participants?.join(', ') ?? null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' · ')
    : '';

  const scheduledTimelineItems: TimelineItem[] = [
    ...events.map((value) => ({ kind: 'event' as const, value })),
    ...tasks
      .filter((value) => value.scheduledStartAt ?? value.dueAt)
      .map((value) => ({ kind: 'task' as const, value })),
  ]
    .filter((item) => {
      const date = itemDate(item);
      return date ? new Date(date).getTime() < loadedUntil.getTime() : false;
    })
    .sort(
      (left, right) =>
        new Date(itemDate(left) ?? 0).getTime() - new Date(itemDate(right) ?? 0).getTime(),
    );
  const unscheduledTasks = tasks.filter((value) => !value.scheduledStartAt && !value.dueAt);
  const now = new Date();
  const today = startOfToday();
  const isToday = (item: TimelineItem) => {
    const date = itemDate(item);
    return date ? new Date(date).toDateString() === today.toDateString() : false;
  };
  const isElapsed = (item: TimelineItem) => {
    if (!isToday(item) || item.kind === 'section' || item.kind === 'now') return false;
    if (item.kind === 'event') return new Date(item.value.endDate) <= now;
    return item.value.status === 'completed' || new Date(itemDate(item) ?? 0) < now;
  };
  const earlierItems = scheduledTimelineItems.filter(isElapsed);
  const visibleScheduledItems = showEarlier
    ? scheduledTimelineItems
    : scheduledTimelineItems.filter((item) => !isElapsed(item));
  const firstFutureIndex = visibleScheduledItems.findIndex((item) => {
    const date = itemDate(item);
    return date ? new Date(date) >= now : false;
  });
  const scheduledWithNow: TimelineItem[] = [
    ...(earlierItems.length > 0 && !showEarlier
      ? [{ kind: 'section' as const, id: 'earlier' as const, count: earlierItems.length }]
      : []),
    ...visibleScheduledItems.slice(
      0,
      firstFutureIndex === -1 ? visibleScheduledItems.length : firstFutureIndex,
    ),
    { kind: 'now' as const },
    ...visibleScheduledItems.slice(
      firstFutureIndex === -1 ? visibleScheduledItems.length : firstFutureIndex,
    ),
  ];
  const timelineItems: TimelineItem[] = [
    ...(scheduledTimelineItems.length > 0 ? scheduledWithNow : []),
    ...(unscheduledTasks.length > 0
      ? [
          { kind: 'section' as const, id: 'unscheduled' as const },
          ...unscheduledTasks.map((value) => ({ kind: 'task' as const, value })),
        ]
      : []),
  ];

  const renderItem = useCallback<ListRenderItem<TimelineItem>>(
    ({ item, index }) =>
      item.kind === 'now' ? (
        <View style={styles.nowMarker} testID="calendar-now-marker">
          <Text variant="caption1" color="text-secondary">
            Now
          </Text>
        </View>
      ) : item.kind === 'section' ? (
        item.id === 'earlier' ? (
          <Pressable
            accessibilityLabel={showEarlier ? 'Hide earlier time' : 'Show earlier time'}
            onPress={() => setShowEarlier((current) => !current)}
            style={styles.earlierHeader}
            testID="calendar-earlier-toggle"
          >
            <Text variant="subhead" color="text-secondary">
              {showEarlier ? 'Hide earlier' : `Earlier · ${item.count ?? 0}`}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.unscheduledHeader} testID="calendar-unscheduled-section">
            <Text variant="title2" color="text-primary">
              Unscheduled
            </Text>
            <Text variant="caption1" color="text-secondary">
              {unscheduledTasks.length} {unscheduledTasks.length === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        )
      ) : (
        <TimelineRow
          item={item}
          onOpen={() => router.push(getTimeBlockRoute(item.kind, item.value.id))}
          onToggleTask={() => {
            if (item.kind === 'task') {
              toggleTask({ taskId: item.value.id, completed: item.value.status !== 'completed' });
            }
          }}
          showDayLabel={(() => {
            const previousTimedItem = timelineItems
              .slice(0, index)
              .reverse()
              .find(
                (candidate): candidate is TimelineRowItem =>
                  candidate.kind === 'task' || candidate.kind === 'event',
              );
            return !previousTimedItem || dayKey(item) !== dayKey(previousTimedItem);
          })()}
        />
      ),
    [router, showEarlier, timelineItems, toggleTask, unscheduledTasks.length],
  );

  const isAuthorized = calendarPermission === 'authorized';
  const canSubmitTimeBlock =
    timeBlock?.primary_intent === 'add_task' ||
    ((timeBlock?.primary_intent === 'add_event' ||
      timeBlock?.primary_intent === 'add_recurring_event') &&
      !!timeBlock.start_time &&
      !!timeBlock.end_time);

  return (
    <View style={styles.container} testID="calendar-screen">
      <FlashList
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 112 }]}
        data={timelineItems}
        keyExtractor={(item) =>
          item.kind === 'section'
            ? item.id
            : item.kind === 'now'
              ? 'now'
              : item.kind === 'task'
                ? `task:${item.value.id}`
                : `event:${item.value.id}:${item.value.startDate}`
        }
        ListEmptyComponent={
          isAuthorized && !isLoadingEvents && unscheduledTasks.length === 0 ? (
            <Text color="text-secondary" style={styles.emptyText}>
              No scheduled time yet.
            </Text>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="title2">Time</Text>
            <Text color="text-secondary">Tasks and calendar events, together.</Text>
            {!isAuthorized ? (
              <IconButton
                accessibilityLabel="Connect calendar"
                icon="calendar.badge.plus"
                testID="calendar-connect"
                variant="surface"
                onPress={() => void connect()}
              />
            ) : null}
            {scheduledTimelineItems.length === 0 && unscheduledTasks.length > 0 ? (
              <Text color="text-secondary" style={styles.emptyText}>
                No scheduled time yet.
              </Text>
            ) : null}
            {error ? (
              <Text color="destructive" testID="calendar-answer-state">
                {error}
              </Text>
            ) : null}
          </View>
        }
        ListFooterComponent={
          isLoadingEvents ? (
            <Text color="tertiary" style={styles.footerText}>
              Loading more time…
            </Text>
          ) : null
        }
        onEndReached={() => void loadNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingEvents && timelineItems.length > 0}
            onRefresh={() => {
              nextStartRef.current = startOfToday();
              setLoadedUntil(startOfToday());
              setEvents([]);
              setHasLoadedEvents(false);
              void loadNextPage();
            }}
          />
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        testID="calendar-list"
      />
      {hasLoadedEvents ? <View testID="calendar-events-ready" /> : null}

      <CalendarResult
        answer={answer}
        canSubmitTimeBlock={canSubmitTimeBlock}
        draftDetails={draftDetails}
        draftTitle={draftTitle}
        editingField={editingField}
        isAsking={isAsking}
        isCreatingTask={isCreatingTask}
        isSavingTimeBlock={isSavingTimeBlock}
        timeBlock={timeBlock}
        onCancel={() => {
          setPrompt(submittedPrompt);
          setTimeBlock(null);
          setEditingField(null);
          setError('');
        }}
        onEdit={setEditingField}
        onEditValue={(value) => {
          if (!editingField) return;
          setTimeBlock((current) =>
            current
              ? {
                  ...current,
                  [editingField]:
                    editingField === 'duration' ? Number(value) || null : value || null,
                }
              : current,
          );
        }}
        onSubmit={() => void submitTimeBlock()}
      />

      <KeyboardStickyView
        offset={{ closed: 0, opened: 40 }}
        pointerEvents="box-none"
        style={[styles.composerDock, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <View style={styles.composer}>
          <Input
            testID="calendar-input"
            value={prompt}
            onChangeText={setPrompt}
            editable={!isAsking}
            placeholder="Add or search anything…"
            returnKeyType="send"
            onSubmitEditing={() => void ask()}
            style={styles.input}
          />
          <IconButton
            accessibilityLabel={isAsking ? 'Interpreting time request' : 'Interpret time request'}
            disabled={!prompt.trim() || isAsking}
            icon="arrow.up.circle.fill"
            isAnimating={isAsking}
            testID="calendar-ask-button"
            tintColor={styles.composerIcon.color}
            variant="ghost"
            onPress={() => void ask()}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  composer: {
    alignItems: 'center',
    backgroundColor: theme.colors['card'],
    borderColor: theme.colors['border-default'],
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    marginHorizontal: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  composerDock: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  composerActionPlaceholder: {
    height: 44,
    width: 44,
  },
  composerIcon: {
    color: theme.colors.primary,
  },
  container: {
    flex: 1,
  },
  answerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[2],
  },
  answerCopy: {
    flex: 1,
  },
  answerIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors['muted'],
    borderRadius: radii.full,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  dayHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  emptyText: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
  },
  eyebrow: {
    letterSpacing: 0.2,
  },
  earlierHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  footerText: {
    paddingVertical: spacing[4],
    textAlign: 'center',
  },
  header: {
    gap: spacing[2],
    padding: spacing[4],
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  listContent: {
    paddingTop: spacing[2],
  },
  nowMarker: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  resultSurface: {
    backgroundColor: theme.colors['card'],
    borderColor: theme.colors['border-default'],
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    padding: spacing[3],
  },
  thinkingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  timeBlockContent: {
    gap: spacing[2],
  },
  unscheduledHeader: {
    backgroundColor: theme.colors['muted'],
    borderTopColor: theme.colors['border-default'],
    borderTopWidth: 1,
    gap: spacing[1],
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  completedTitle: {
    textDecorationLine: 'line-through',
  },
  itemCopy: {
    flex: 1,
    gap: spacing[1],
    minWidth: 0,
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 72,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  typeIcon: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
}));
