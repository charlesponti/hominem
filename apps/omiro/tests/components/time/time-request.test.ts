import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveTimeRequest } from '~/components/time/time-request';
import type { CalendarEvent } from '~/modules/on-device-ai';

const event = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  calendarTitle: 'Work',
  endDate: '2026-08-10T11:00:00.000Z',
  id: 'event-1',
  isAllDay: false,
  isEditable: true,
  location: null,
  notes: null,
  participants: [],
  recurrenceDescription: null,
  startDate: '2026-08-10T10:00:00.000Z',
  title: 'Planning',
  ...overrides,
});

const options = {
  calendarContext: '',
  events: [],
  gateway: {
    askSchedule: vi.fn(async () => ({ text: 'You have a meeting at 10.' })),
    listEvents: vi.fn(async () => []),
  },
  permission: 'authorized' as const,
  tasks: [],
};

describe('resolveTimeRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-08-10T09:00:00.000Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an answer for a calendar search', async () => {
    const result = await resolveTimeRequest({
      ...options,
      parse: vi.fn(async () => ({ block: { primary_intent: 'search' } as never })),
      prompt: 'When am I free?',
    });

    expect(result).toEqual({ kind: 'answer', answer: 'You have a meeting at 10.' });
    expect(options.gateway.askSchedule).toHaveBeenCalledWith('When am I free?');
  });

  it('returns a permission error before calling the calendar gateway', async () => {
    const listEvents = vi.fn(async () => []);
    const result = await resolveTimeRequest({
      ...options,
      gateway: { ...options.gateway, listEvents },
      parse: vi.fn(async () => ({ block: { primary_intent: 'search' } as never })),
      permission: 'denied',
      prompt: 'Find my next meeting',
    });

    expect(result).toEqual({
      kind: 'error',
      message: 'Connect your iOS Calendar to search scheduled events.',
      submittedPrompt: 'Find my next meeting',
    });
    expect(listEvents).not.toHaveBeenCalled();
  });

  it('opens a unique matching event', async () => {
    const matchingEvent = event();
    const result = await resolveTimeRequest({
      ...options,
      events: [matchingEvent],
      parse: vi.fn(async () => ({
        block: { primary_intent: 'edit_event', target_title: 'Planning' } as never,
      })),
      prompt: 'Move planning',
    });

    expect(result).toEqual({ kind: 'open-event', event: matchingEvent });
  });

  it('keeps multiple matching events available for selection', async () => {
    const first = event();
    const second = event({ id: 'event-2', startDate: '2026-08-11T10:00:00.000Z' });
    const result = await resolveTimeRequest({
      ...options,
      events: [first, second],
      parse: vi.fn(async () => ({
        block: { primary_intent: 'edit_event', target_title: 'Planning' } as never,
      })),
      prompt: 'Move planning',
    });

    expect(result).toEqual({
      candidates: [first, second],
      kind: 'event-choice',
      submittedPrompt: 'Move planning',
    });
  });

  it('returns a draft for a task request', async () => {
    const block = { primary_intent: 'add_task', title: 'Write brief' } as never;
    const result = await resolveTimeRequest({
      ...options,
      parse: vi.fn(async () => ({ block })),
      prompt: 'Remind me to write brief',
    });

    expect(result).toEqual({
      block,
      kind: 'draft',
      submittedPrompt: 'Remind me to write brief',
    });
  });
});
