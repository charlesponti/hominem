import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { makeStyles, spacing, Text } from '~/components/theme';
import { IconButton } from '~/components/ui/icon-button';
import type { CalendarEvent, CalendarPermissionStatus } from '~/modules/on-device-ai';
import { getTimeBlockRoute } from '~/services/navigation/routes';
import { useTaskComplete } from '~/services/tasks/use-task-complete';
import { useTaskCreate } from '~/services/tasks/use-task-create';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';
import { useTimeBlockParse } from '~/services/tasks/use-time-block-parse';

import { timeEventGateway, type TimeEventGateway } from './time-event-gateway';
import type {
  EditableTimeBlockField,
  TimeInteractionState,
  TimeItem,
  TimeOpening,
} from './time-types';
import {
  buildTimeStreamRows,
  findEventCandidates,
  findOpenings,
  getAvailabilityRange,
  getUnscheduledTasks,
  PAGE_DAYS,
  startOfToday,
} from './time-utils';
import { TimeComposer } from './TimeComposer';
import { TimeStream } from './TimeStream';

interface TimeWorkspaceProps {
  gateway?: TimeEventGateway;
  isFocused: boolean;
  onOpenItem: (item: TimeItem) => void;
}

export function TimeWorkspace({
  gateway = timeEventGateway,
  isFocused,
  onOpenItem,
}: TimeWorkspaceProps) {
  const router = useRouter();
  const styles = useStyles();
  const [prompt, setPrompt] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadedSince, setLoadedSince] = useState(() => startOfToday());
  const [loadedUntil, setLoadedUntil] = useState(() => startOfToday());
  const [scrollOffset, setScrollOffset] = useState(0);
  const [interaction, setInteraction] = useState<TimeInteractionState>({ kind: 'idle' });
  const [permission, setPermission] = useState<CalendarPermissionStatus | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(events.length > 0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [toastExpanded, setToastExpanded] = useState(false);
  const loadingRef = useRef(false);
  const { data: tasks = [] } = useTasksQuery({ enabled: isFocused });
  const { mutate: toggleTask } = useTaskComplete();
  const { mutateAsync: createTask } = useTaskCreate();
  const parseTimeBlock = useTimeBlockParse();

  useEffect(() => {
    void gateway.getPermission().then(setPermission);
  }, [gateway]);

  const loadNextPage = useCallback(async () => {
    if (permission !== 'authorized' || loadingRef.current) return;
    loadingRef.current = true;
    setIsLoadingEvents(true);
    const isInitialLoad = !hasLoadedEvents && loadedSince.getTime() === loadedUntil.getTime();
    const start = isInitialLoad
      ? new Date(loadedSince.getTime() - PAGE_DAYS * 24 * 60 * 60 * 1000)
      : loadedUntil;
    const end = new Date(start);
    end.setDate(end.getDate() + PAGE_DAYS);
    if (isInitialLoad) end.setDate(end.getDate() + PAGE_DAYS);
    try {
      const page = await gateway.listEvents(start.toISOString(), end.toISOString());
      setEvents((current) => {
        const existing = new Set(current.map((event) => `${event.id}:${event.startDate}`));
        return [
          ...current,
          ...page.filter((event) => !existing.has(`${event.id}:${event.startDate}`)),
        ];
      });
      if (isInitialLoad) setLoadedSince(start);
      setLoadedUntil(end);
      setHasLoadedEvents(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load scheduled events.';
      setToastKey((k) => k + 1);
      setErrorToast(message);
    } finally {
      loadingRef.current = false;
      setIsLoadingEvents(false);
    }
  }, [gateway, hasLoadedEvents, loadedSince, loadedUntil, permission]);

  useEffect(() => {
    if (permission !== 'authorized' || hasLoadedEvents || loadingRef.current) return;
    void loadNextPage();
  }, [hasLoadedEvents, loadNextPage, permission]);

  const onConnectCalendar = useCallback(async () => {
    if (permission === 'denied') {
      await Linking.openSettings();
      return;
    }
    setPermission(await gateway.requestPermission());
  }, [gateway, permission]);

  const calendarContext = useMemo(
    () =>
      [
        ...events.map((event) => `${event.title} at ${event.startDate}–${event.endDate}`),
        ...tasks
          .filter((task) => task.scheduledStartAt ?? task.dueAt)
          .map((task) => `${task.title} at ${task.scheduledStartAt ?? task.dueAt}`),
      ]
        .join('\n')
        .slice(0, 19000),
    [events, tasks],
  );

  const showError = useCallback((message: string, submittedPrompt: string) => {
    setPrompt(submittedPrompt);
    setInteraction({ kind: 'idle' });
    setToastExpanded(false);
    setToastKey((k) => k + 1);
    setErrorToast(message);
  }, []);

  const ask = useCallback(async () => {
    const submittedPrompt = prompt.trim();
    if (!submittedPrompt || interaction.kind === 'parsing' || isSaving) return;

    setInteraction({ kind: 'parsing', submittedPrompt });

    try {
      const { block } = await parseTimeBlock.mutateAsync({
        transcript: submittedPrompt,
        calendarContext,
      });
      setPrompt('');
      if (block.primary_intent === 'search') {
        if (permission !== 'authorized') {
          showError('Connect your iOS Calendar to search scheduled events.', submittedPrompt);
          return;
        }
        const result = await gateway.askSchedule(submittedPrompt);
        setInteraction({ kind: 'answer', answer: result.text });
        return;
      }
      if (block.primary_intent === 'schedule_gap_fill') {
        if (permission !== 'authorized') {
          showError('Connect your iOS Calendar to find available time.', submittedPrompt);
          return;
        }
        const range = getAvailabilityRange(block);
        const rangeEvents = await gateway.listEvents(
          range.start.toISOString(),
          range.end.toISOString(),
        );
        const openings = findOpenings({
          durationMinutes: block.duration ?? 30,
          events: rangeEvents,
          range,
          tasks,
        });
        if (openings.length === 0) {
          showError('No opening fits that request in the selected time range.', submittedPrompt);
          return;
        }
        setInteraction({ kind: 'availability', block, openings, submittedPrompt });
        return;
      }
      if (block.primary_intent === 'edit_event' || block.primary_intent === 'cancel_event') {
        if (permission !== 'authorized') {
          showError('Connect your iOS Calendar to review that event.', submittedPrompt);
          return;
        }
        const candidates = findEventCandidates(events, block.target_title);
        if (candidates.length === 0) {
          showError('I could not find that upcoming calendar event.', submittedPrompt);
          return;
        }
        if (candidates.length === 1) {
          router.push(getTimeBlockRoute('event', candidates[0].id));
          setInteraction({ kind: 'idle' });
          return;
        }
        setInteraction({ kind: 'event-choice', candidates, submittedPrompt });
        return;
      }
      setInteraction({ kind: 'draft', block, submittedPrompt });
    } catch (error) {
      showError(
        error instanceof Error ? error.message : 'Unable to interpret that time request.',
        submittedPrompt,
      );
    }
  }, [
    calendarContext,
    events,
    gateway,
    interaction.kind,
    isSaving,
    parseTimeBlock,
    permission,
    prompt,
    showError,
    router,
    tasks,
  ]);

  const chooseOpening = useCallback((opening: TimeOpening) => {
    setInteraction((current) => {
      if (current.kind !== 'availability') return current;
      return {
        kind: 'draft',
        submittedPrompt: current.submittedPrompt,
        block: {
          ...current.block,
          primary_intent: 'add_event',
          start_time: opening.start,
          end_time: opening.end,
        },
      };
    });
  }, []);

  const updateDraft = useCallback((field: EditableTimeBlockField, value: string) => {
    setInteraction((current) => {
      if (current.kind !== 'draft') return current;
      return {
        ...current,
        block: {
          ...current.block,
          [field]: value || null,
        },
      };
    });
  }, []);

  const submitDraft = useCallback(async () => {
    if (interaction.kind !== 'draft' || isSaving) return;
    const { block } = interaction;
    const title = block.title?.trim();
    if (!title) {
      showError('Add a title before saving this time block.', interaction.submittedPrompt);
      return;
    }
    setIsSaving(true);
    try {
      if (block.primary_intent === 'add_task') {
        await createTask({
          title,
          dueAt: block.deadline_fixed
            ? new Date(`${block.deadline_fixed}T23:59:59`).toISOString()
            : null,
          durationMinutes: block.duration,
          location: block.location,
          scheduledStartAt: block.start_time,
          scheduledEndAt: block.end_time,
          schedulingWindowStartAt: block.scheduling_window_start,
          schedulingWindowEndAt: block.scheduling_window_end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } else if (
        block.primary_intent === 'add_event' ||
        block.primary_intent === 'add_recurring_event'
      ) {
        if (permission !== 'authorized') {
          showError(
            'Connect your iOS Calendar before adding an event.',
            interaction.submittedPrompt,
          );
          return;
        }
        if (!block.start_time || !block.end_time) {
          showError(
            'Choose a start and end time before adding this event.',
            interaction.submittedPrompt,
          );
          return;
        }
        const event = await gateway.createEvent(
          title,
          block.start_time,
          block.end_time,
          block.location,
          block.recurrence_rule,
        );
        setEvents((current) =>
          [...current, event].sort((a, b) => a.startDate.localeCompare(b.startDate)),
        );
      } else {
        showError('Review this request before making a change.', interaction.submittedPrompt);
        return;
      }
      setInteraction({ kind: 'idle' });
    } catch (error) {
      showError(
        error instanceof Error ? error.message : 'Unable to save this time block.',
        interaction.submittedPrompt,
      );
    } finally {
      setIsSaving(false);
    }
  }, [createTask, gateway, interaction, isSaving, permission, showError]);

  const cancelResult = useCallback(() => {
    const submittedPrompt =
      interaction.kind === 'draft' ||
      interaction.kind === 'availability' ||
      interaction.kind === 'event-choice'
        ? interaction.submittedPrompt
        : '';
    setPrompt(submittedPrompt);
    setInteraction({ kind: 'idle' });
  }, [interaction]);

  const resetStream = useCallback(() => {
    const start = startOfToday();
    setLoadedSince(start);
    setLoadedUntil(start);
    setEvents([]);
    setHasLoadedEvents(false);
  }, []);

  const rows = buildTimeStreamRows({
    events,
    loadedUntil,
    tasks,
  });
  const unscheduledTaskCount = getUnscheduledTasks(tasks).length;

  return (
    <View style={styles.container} testID="time-screen">
      <TimeStream
        calendarPermission={permission}
        isLoadingEvents={isLoadingEvents}
        onConnectCalendar={() => void onConnectCalendar()}
        onEndReached={() => void loadNextPage()}
        onOpenItem={onOpenItem}
        onRefresh={resetStream}
        onScrollOffsetChange={setScrollOffset}
        onToggleTask={(item) =>
          toggleTask({ taskId: item.value.id, completed: item.value.status !== 'completed' })
        }
        restoredScrollOffset={scrollOffset}
        rows={rows}
        unscheduledTaskCount={unscheduledTaskCount}
      />
      {hasLoadedEvents ? <View testID="time-events-ready" /> : null}
      {errorToast !== null ? (
        <View key={toastKey} style={styles.toast}>
          <Pressable
            accessibilityLabel={`Error: ${errorToast}`}
            accessibilityRole="button"
            onPress={() => {
              setToastExpanded((v) => !v);
            }}
            style={styles.toastContent}
          >
            <Text
              color="destructive"
              numberOfLines={toastExpanded ? undefined : 1}
              style={styles.toastMessage}
              variant="footnote"
            >
              {errorToast}
            </Text>
            <IconButton
              accessibilityLabel="Copy error"
              icon="doc.on.doc"
              onPress={() => void Clipboard.setStringAsync(errorToast)}
            />
          </Pressable>
          <IconButton
            accessibilityLabel="Dismiss error"
            icon="xmark"
            onPress={() => {
              setErrorToast(null);
              setToastExpanded(false);
            }}
          />
        </View>
      ) : null}
      <TimeComposer
        disabled={interaction.kind === 'parsing' || isSaving}
        isSaving={isSaving}
        onChangeText={(value) => {
          setPrompt(value);
        }}
        onCancel={cancelResult}
        onChooseEvent={(id) => router.push(getTimeBlockRoute('event', id))}
        onChooseOpening={chooseOpening}
        onEditField={(field, value) => updateDraft(field, value)}
        onSubmit={() => void ask()}
        onSubmitDraft={() => void submitDraft()}
        state={interaction}
        value={prompt}
      />
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: { backgroundColor: theme.colors.background, flex: 1 },
  toast: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.destructive,
    borderRadius: theme.borderRadii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1],
    marginHorizontal: spacing[4],
    marginBottom: spacing[1],
    padding: spacing[2],
  },
  toastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  toastMessage: {
    flex: 1,
  },
}));
