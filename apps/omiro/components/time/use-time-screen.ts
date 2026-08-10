import { useCallback, useMemo, useState } from 'react';

import type { CalendarEvent } from '~/modules/on-device-ai';
import { useTaskComplete } from '~/services/tasks/use-task-complete';
import { useTaskCreate } from '~/services/tasks/use-task-create';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';
import { useTimeBlockParse } from '~/services/tasks/use-time-block-parse';

import { type TimeEventGateway, timeEventGateway } from './time-event-gateway';
import { useTimePreview } from './time-preview-context';
import { applyRequestResult, resolveTimeRequest } from './time-request';
import { buildCalendarContext } from './time-screen-utils';
import type {
  EditableTimeBlockField,
  TimeInteractionState,
  TimeItem,
  TimeOpening,
} from './time-types';
import { buildTimeStreamRows, getUnscheduledTasks } from './time-utils';
import { useTimeCalendar } from './use-time-calendar';

interface UseTimeScreenOptions {
  gateway?: TimeEventGateway;
  isFocused: boolean;
  onOpenEvent: (event: CalendarEvent) => void;
}

export function useTimeScreen({
  gateway = timeEventGateway,
  isFocused,
  onOpenEvent,
}: UseTimeScreenOptions) {
  const [prompt, setPrompt] = useState('');
  const [interaction, setInteraction] = useState<TimeInteractionState>({ kind: 'idle' });
  const [isSaving, setIsSaving] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [toastExpanded, setToastExpanded] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const { data: tasks = [] } = useTasksQuery({ enabled: isFocused });
  const { mutate: toggleTask } = useTaskComplete();
  const { mutateAsync: createTask } = useTaskCreate();
  const parseTimeBlock = useTimeBlockParse();
  const { scenario } = useTimePreview();

  const showError = useCallback((message: string, submittedPrompt: string) => {
    setPrompt(submittedPrompt);
    setInteraction({ kind: 'idle' });
    setToastExpanded(false);
    setToastKey((key) => key + 1);
    setErrorToast(message);
  }, []);

  const showCalendarError = useCallback((message: string) => {
    setToastKey((key) => key + 1);
    setErrorToast(message);
  }, []);

  const calendar = useTimeCalendar({
    gateway,
    onError: showCalendarError,
  });

  const calendarContext = useMemo(
    () => buildCalendarContext(calendar.events, tasks),
    [calendar.events, tasks],
  );

  const ask = useCallback(async () => {
    const submittedPrompt = prompt.trim();
    if (!submittedPrompt || interaction.kind === 'parsing' || isSaving) return;

    setInteraction({ kind: 'parsing', submittedPrompt });
    const result = await resolveTimeRequest({
      calendarContext,
      events: calendar.events,
      gateway,
      parse: ({ calendarContext: context, transcript }) =>
        parseTimeBlock.mutateAsync({ transcript, calendarContext: context }),
      permission: calendar.permission,
      prompt: submittedPrompt,
      tasks,
    });
    applyRequestResult(result, setInteraction, onOpenEvent, setPrompt, showError);
  }, [
    calendar.events,
    calendar.permission,
    calendarContext,
    gateway,
    interaction.kind,
    isSaving,
    onOpenEvent,
    parseTimeBlock,
    prompt,
    showError,
    tasks,
  ]);

  const chooseOpening = useCallback((opening: TimeOpening) => {
    setInteraction((current) => {
      if (current.kind !== 'availability') return current;
      return {
        block: {
          ...current.block,
          end_time: opening.end,
          primary_intent: 'add_event',
          start_time: opening.start,
        },
        kind: 'draft',
        submittedPrompt: current.submittedPrompt,
      };
    });
  }, []);

  const updateDraft = useCallback((field: EditableTimeBlockField, value: string) => {
    setInteraction((current) =>
      current.kind === 'draft'
        ? { ...current, block: { ...current.block, [field]: value || null } }
        : current,
    );
  }, []);

  const submitDraft = useCallback(async () => {
    if (interaction.kind !== 'draft' || isSaving) return;
    const { block, submittedPrompt } = interaction;
    const title = block.title?.trim();
    if (!title) {
      showError('Add a title before saving this time block.', submittedPrompt);
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
        if (calendar.permission !== 'authorized') {
          showError('Connect your iOS Calendar before adding an event.', submittedPrompt);
          return;
        }
        if (!block.start_time || !block.end_time) {
          showError('Choose a start and end time before adding this event.', submittedPrompt);
          return;
        }
        const event = await gateway.createEvent(
          title,
          block.start_time,
          block.end_time,
          block.location,
          block.recurrence_rule,
        );
        calendar.addEvent(event);
      } else {
        showError('Review this request before making a change.', submittedPrompt);
        return;
      }
      setInteraction({ kind: 'idle' });
    } catch (error) {
      showError(
        error instanceof Error ? error.message : 'Unable to save this time block.',
        submittedPrompt,
      );
    } finally {
      setIsSaving(false);
    }
  }, [calendar, createTask, gateway, interaction, isSaving, showError]);

  const cancelResult = useCallback(() => {
    const submittedPrompt =
      interaction.kind === 'availability' || interaction.kind === 'event-choice'
        ? interaction.submittedPrompt
        : '';
    setPrompt(submittedPrompt);
    setInteraction({ kind: 'idle' });
  }, [interaction]);

  const previewEvents = scenario ? scenario.events : calendar.events;
  const previewTasks = scenario ? scenario.tasks : tasks;
  const rows = buildTimeStreamRows({
    events: previewEvents,
    loadedUntil: scenario ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) : calendar.loadedUntil,
    tasks: previewTasks,
  });

  return {
    ask,
    calendar: {
      ...calendar,
      isLoadingEvents: scenario ? false : calendar.isLoadingEvents,
      permission: scenario ? 'authorized' : calendar.permission,
    },
    cancelResult,
    chooseOpening,
    errorToast,
    interaction,
    isSaving,
    onDismissError: () => {
      setErrorToast(null);
      setToastExpanded(false);
    },
    onExpandError: () => setToastExpanded((expanded) => !expanded),
    onScrollOffsetChange: setScrollOffset,
    onToggleTask: (item: Extract<TimeItem, { kind: 'task' }>) =>
      toggleTask({ taskId: item.value.id, completed: item.value.status !== 'completed' }),
    prompt,
    rows,
    setPrompt,
    restoredScrollOffset: scrollOffset,
    submitDraft,
    toastExpanded,
    toastKey,
    unscheduledTaskCount: getUnscheduledTasks(previewTasks).length,
    updateDraft,
  };
}
