import { describe, expect, it } from 'vitest';

import { buildCalendarContext } from '~/components/time/time-request-context';
import type { CalendarEvent } from '~/modules/on-device-ai';

const event: CalendarEvent = {
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
};

describe('time request context', () => {
  it('builds bounded parser context from events and scheduled tasks', () => {
    const context = buildCalendarContext(
      [event],
      [
        { dueAt: null, scheduledStartAt: '2026-08-10T12:00:00.000Z', title: 'Write brief' },
        { dueAt: null, scheduledStartAt: null, title: 'Unscheduled task' },
      ],
    );

    expect(context).toBe(
      'Planning at 2026-08-10T10:00:00.000Z–2026-08-10T11:00:00.000Z\n' +
        'Write brief at 2026-08-10T12:00:00.000Z',
    );
  });

  it('limits parser context to the supported size', () => {
    const context = buildCalendarContext(
      [],
      [{ dueAt: null, scheduledStartAt: '2026-08-10T12:00:00.000Z', title: 'x'.repeat(20_000) }],
    );

    expect(context).toHaveLength(19_000);
  });
});
