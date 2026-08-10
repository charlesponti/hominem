import { describe, expect, it } from 'vitest';

import { getCalendarPage, mergeCalendarEvents } from '~/components/time/use-time-calendar';
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

describe('useTimeCalendar helpers', () => {
  it('loads two pages on the initial request to include prior context', () => {
    const page = getCalendarPage(
      new Date('2026-08-10T00:00:00.000Z'),
      new Date('2026-08-10T00:00:00.000Z'),
      false,
    );

    expect(page.isInitialLoad).toBe(true);
    expect(page.start.toISOString()).toBe('2026-07-11T00:00:00.000Z');
    expect(page.end.toISOString()).toBe('2026-09-09T00:00:00.000Z');
  });

  it('loads one page after the initial request', () => {
    const page = getCalendarPage(
      new Date('2026-08-03T00:00:00.000Z'),
      new Date('2026-08-17T00:00:00.000Z'),
      true,
    );

    expect(page.isInitialLoad).toBe(false);
    expect(page.start.toISOString()).toBe('2026-08-17T00:00:00.000Z');
    expect(page.end.toISOString()).toBe('2026-09-16T00:00:00.000Z');
  });

  it('deduplicates events by id and occurrence start', () => {
    const first = event();
    const duplicate = event();
    const recurringOccurrence = event({ startDate: '2026-08-17T10:00:00.000Z' });

    expect(mergeCalendarEvents([first], [duplicate, recurringOccurrence])).toEqual([
      first,
      recurringOccurrence,
    ]);
  });
});
