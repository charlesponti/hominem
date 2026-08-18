import { describe, expect, it } from 'vitest';

import { createIcal, type CalendarExportEvent } from './ical';

const event: CalendarExportEvent = {
  id: 'event-1',
  title: 'Planning, Q1',
  description: 'Bring notes; and questions\nplease.',
  startsAt: '2026-08-18T10:00:00.000Z',
  endsAt: '2026-08-18T11:00:00.000Z',
  isAllDay: false,
  recurrenceRule: 'RRULE:FREQ=WEEKLY;BYDAY=TU',
  externalUid: null,
  status: 'confirmed',
  organizer: 'organizer@example.com',
  updatedAt: '2026-08-17T12:00:00.000Z',
  placeName: 'Studio',
  formattedAddress: '123 Main St, Portland',
  attendees: [{ name: 'Ada, Lovelace', email: 'ada@example.com' }],
};

describe('createIcal', () => {
  it('serializes event fields with RFC 5545 escaping and UTC timestamps', () => {
    const ical = createIcal([event]);

    expect(ical).toContain('UID:event-1@hominem');
    expect(ical).toContain('DTSTART:20260818T100000Z');
    expect(ical).toContain('DTEND:20260818T110000Z');
    expect(ical).toContain('SUMMARY:Planning\\, Q1');
    expect(ical).toContain('DESCRIPTION:Bring notes\\; and questions\\nplease.');
    expect(ical).toContain('LOCATION:Studio\\, 123 Main St\\, Portland');
    expect(ical).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU');
    expect(ical).toContain('ORGANIZER;CN=organizer@example.com:mailto:organizer@example.com');
    expect(ical).toContain('ATTENDEE;CN=Ada\\, Lovelace:mailto:ada@example.com');
  });

  it('uses DATE values for all-day events and preserves cancelled status', () => {
    const ical = createIcal([
      {
        ...event,
        id: 'all-day',
        title: 'Holiday',
        startsAt: '2026-12-25T00:00:00.000Z',
        endsAt: '2026-12-26T00:00:00.000Z',
        isAllDay: true,
        recurrenceRule: null,
        status: 'cancelled',
        organizer: null,
        attendees: [],
      },
    ]);

    expect(ical).toContain('DTSTART;VALUE=DATE:20261225');
    expect(ical).toContain('DTEND;VALUE=DATE:20261226');
    expect(ical).toContain('STATUS:CANCELLED');
  });

  it('folds long lines at 75 UTF-8 bytes', () => {
    const ical = createIcal([{ ...event, title: 'x'.repeat(100) }]);
    const summaryLines = ical
      .split('\r\n')
      .filter((line) => line.startsWith('SUMMARY:') || line.startsWith(' '));

    expect(new TextEncoder().encode(summaryLines[0]).length).toBeLessThanOrEqual(75);
    expect(summaryLines[1]).toMatch(/^ /);
  });
});
