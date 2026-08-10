import { useIsFocused } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import type { CalendarEvent } from '~/modules/on-device-ai';
import { calendarEventGateway } from '~/services/calendar/calendar-event-gateway';
import {
  useCalendarEvents,
  useCalendarPermission,
  useCreateCalendarEvent,
} from '~/services/calendar/calendar-queries';
import { useTaskCreate } from '~/services/tasks/use-task-create';
import { useTasksQuery } from '~/services/tasks/use-tasks-query';
import { useTimeBlockParse } from '~/services/tasks/use-time-block-parse';

import { resolveTimeRequest } from './time-request';
import { buildCalendarContext } from './time-request-context';
import type { EditableTimeBlockField, TimeInteractionState, TimeOpening } from './time-types';

interface UseTimeComposerOptions {
  onError: (message: string) => void;
  onOpenEvent: (event: CalendarEvent) => void;
}

export function useTimeComposer({ onError, onOpenEvent }: UseTimeComposerOptions) {
  const isFocused = useIsFocused();
  const [prompt, setPrompt] = useState('');
  const [interaction, setInteraction] = useState<TimeInteractionState>({ kind: 'idle' });
  const { data: permission = null } = useCalendarPermission({ enabled: isFocused });
  const calendar = useCalendarEvents({ enabled: isFocused && permission === 'authorized' });
  const { data: tasks = [] } = useTasksQuery({ enabled: isFocused });
  const createTask = useTaskCreate();
  const createEvent = useCreateCalendarEvent();
  const parseTimeBlock = useTimeBlockParse();
  const isSaving = createEvent.isPending || createTask.isPending;
  const calendarContext = useMemo(
    () => buildCalendarContext(calendar.events, tasks),
    [calendar.events, tasks],
  );

  const fail = useCallback(
    (message: string, submittedPrompt: string) => {
      setPrompt(submittedPrompt);
      setInteraction({ kind: 'idle' });
      onError(message);
    },
    [onError],
  );

  const ask = useCallback(async () => {
    const submittedPrompt = prompt.trim();
    if (!submittedPrompt || interaction.kind === 'parsing' || isSaving) return;

    setInteraction({ kind: 'parsing', submittedPrompt });
    const result = await resolveTimeRequest({
      calendarContext,
      events: calendar.events,
      gateway: calendarEventGateway,
      parse: ({ calendarContext: context, transcript }) =>
        parseTimeBlock.mutateAsync({ transcript, calendarContext: context }),
      permission,
      prompt: submittedPrompt,
      tasks,
    });

    if (result.kind === 'error') {
      fail(result.message, result.submittedPrompt);
      return;
    }
    if (result.kind === 'open-event') {
      onOpenEvent(result.event);
      setInteraction({ kind: 'idle' });
      return;
    }
    setPrompt('');
    setInteraction(result);
  }, [
    calendar.events,
    calendarContext,
    fail,
    interaction.kind,
    isSaving,
    onOpenEvent,
    parseTimeBlock,
    permission,
    prompt,
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

  const chooseEvent = useCallback(
    (id: string) => {
      if (interaction.kind !== 'event-choice') return;
      const event = interaction.candidates.find((candidate) => candidate.id === id);
      if (!event) return;
      onOpenEvent(event);
      setInteraction({ kind: 'idle' });
    },
    [interaction, onOpenEvent],
  );

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
      fail('Add a title before saving this time block.', submittedPrompt);
      return;
    }

    try {
      if (block.primary_intent === 'add_task') {
        await createTask.mutateAsync({
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
          fail('Connect your iOS Calendar before adding an event.', submittedPrompt);
          return;
        }
        if (!block.start_time || !block.end_time) {
          fail('Choose a start and end time before adding this event.', submittedPrompt);
          return;
        }
        await createEvent.mutateAsync({
          endDate: block.end_time,
          location: block.location,
          recurrenceRule: block.recurrence_rule,
          startDate: block.start_time,
          title,
        });
      } else {
        fail('Review this request before making a change.', submittedPrompt);
        return;
      }
      setInteraction({ kind: 'idle' });
    } catch (error) {
      fail(
        error instanceof Error ? error.message : 'Unable to save this time block.',
        submittedPrompt,
      );
    }
  }, [createEvent, createTask, fail, interaction, isSaving, permission]);

  const cancelResult = useCallback(() => {
    const submittedPrompt =
      interaction.kind === 'availability' || interaction.kind === 'event-choice'
        ? interaction.submittedPrompt
        : '';
    setPrompt(submittedPrompt);
    setInteraction({ kind: 'idle' });
  }, [interaction]);

  return {
    ask,
    cancelResult,
    chooseEvent,
    chooseOpening,
    interaction,
    isSaving,
    prompt,
    setPrompt,
    submitDraft,
    updateDraft,
  };
}
