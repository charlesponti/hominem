import type { CalendarEvent, CalendarPermissionStatus } from '~/modules/on-device-ai';

import type { TimeBlock, TimeInteractionState, TimeOpening } from './time-types';
import { findEventCandidates, findOpenings, getAvailabilityRange } from './time-utils';

type RequestResult =
  | { kind: 'answer'; answer: string }
  | { kind: 'availability'; block: TimeBlock; openings: TimeOpening[]; submittedPrompt: string }
  | { kind: 'draft'; block: TimeBlock; submittedPrompt: string }
  | { kind: 'event-choice'; candidates: CalendarEvent[]; submittedPrompt: string }
  | { kind: 'open-event'; event: CalendarEvent }
  | { kind: 'error'; message: string; submittedPrompt: string };

interface ResolveTimeRequestOptions {
  calendarContext: string;
  events: CalendarEvent[];
  gateway: {
    askSchedule: (prompt: string) => Promise<{ text: string }>;
    listEvents: (startDate: string, endDate: string) => Promise<CalendarEvent[]>;
  };
  parse: (input: { calendarContext: string; transcript: string }) => Promise<{ block: TimeBlock }>;
  permission: CalendarPermissionStatus | null;
  prompt: string;
  tasks: Parameters<typeof findOpenings>[0]['tasks'];
}

export async function resolveTimeRequest({
  calendarContext,
  events,
  gateway,
  parse,
  permission,
  prompt,
  tasks,
}: ResolveTimeRequestOptions): Promise<RequestResult> {
  const submittedPrompt = prompt.trim();

  try {
    const { block } = await parse({ calendarContext, transcript: submittedPrompt });

    if (block.primary_intent === 'search') {
      if (permission !== 'authorized') {
        return {
          kind: 'error',
          message: 'Connect your iOS Calendar to search scheduled events.',
          submittedPrompt,
        };
      }
      const result = await gateway.askSchedule(submittedPrompt);
      return { answer: result.text, kind: 'answer' };
    }

    if (block.primary_intent === 'schedule_gap_fill') {
      if (permission !== 'authorized') {
        return {
          kind: 'error',
          message: 'Connect your iOS Calendar to find available time.',
          submittedPrompt,
        };
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
      return openings.length > 0
        ? { block, kind: 'availability', openings, submittedPrompt }
        : {
            kind: 'error',
            message: 'No opening fits that request in the selected time range.',
            submittedPrompt,
          };
    }

    if (block.primary_intent === 'edit_event' || block.primary_intent === 'cancel_event') {
      if (permission !== 'authorized') {
        return {
          kind: 'error',
          message: 'Connect your iOS Calendar to review that event.',
          submittedPrompt,
        };
      }
      const candidates = findEventCandidates(events, block.target_title);
      if (candidates.length === 0) {
        return {
          kind: 'error',
          message: 'I could not find that upcoming calendar event.',
          submittedPrompt,
        };
      }
      return candidates.length === 1
        ? { event: candidates[0], kind: 'open-event' }
        : { candidates, kind: 'event-choice', submittedPrompt };
    }

    return { block, kind: 'draft', submittedPrompt };
  } catch (error) {
    return {
      kind: 'error',
      message: error instanceof Error ? error.message : 'Unable to interpret that time request.',
      submittedPrompt,
    };
  }
}

export function applyRequestResult(
  result: RequestResult,
  setInteraction: (state: TimeInteractionState) => void,
  onOpenEvent: (event: CalendarEvent) => void,
  setPrompt: (prompt: string) => void,
  showError: (message: string, submittedPrompt: string) => void,
) {
  if (result.kind === 'error') {
    showError(result.message, result.submittedPrompt);
    return;
  }
  if (result.kind === 'open-event') {
    onOpenEvent(result.event);
    setInteraction({ kind: 'idle' });
    return;
  }
  setPrompt('');
  if (result.kind === 'answer') setInteraction(result);
  if (result.kind === 'availability') setInteraction(result);
  if (result.kind === 'draft') setInteraction(result);
  if (result.kind === 'event-choice') setInteraction(result);
}
