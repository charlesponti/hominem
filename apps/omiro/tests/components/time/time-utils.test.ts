import { describe, expect, it } from 'vitest';

import {
  buildTimeStreamRows,
  findEventCandidates,
  findOpenings,
  getAvailabilityRange,
} from '~/components/time/time-utils';
import type { CalendarEvent, CalendarPermissionStatus } from '~/modules/on-device-ai';

const event = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  calendarTitle: 'Work',
  endDate: '2026-07-28T11:00:00.000Z',
  id: 'event-1',
  isAllDay: false,
  isEditable: true,
  location: null,
  notes: null,
  participants: [],
  recurrenceDescription: null,
  startDate: '2026-07-28T10:00:00.000Z',
  title: 'Planning',
  ...overrides,
});

const task = (overrides = {}) =>
  ({
    dueAt: null,
    id: 'task-1',
    parentTaskId: null,
    scheduledEndAt: '2026-07-28T10:30:00.000Z',
    scheduledStartAt: '2026-07-28T10:00:00.000Z',
    status: 'open',
    title: 'Write brief',
    ...overrides,
  }) as never;

describe('Time stream rows', () => {
  it.each<[CalendarPermissionStatus, boolean]>([
    ['denied', true],
    ['notDetermined', true],
    ['authorized', false],
  ])('keeps task rows available for %s Calendar permission', (permission, expectsNotice) => {
    const rows = buildTimeStreamRows({
      events: [],
      loadedUntil: new Date('2026-08-01T00:00:00.000Z'),
      now: new Date('2026-07-27T09:00:00.000Z'),
      permission,
      showEarlier: false,
      tasks: [task()],
    });

    expect(rows.some((row) => row.kind === 'task')).toBe(true);
    expect(rows.some((row) => row.kind === 'permission-notice')).toBe(expectsNotice);
  });
});

describe('Time availability', () => {
  it('uses the next seven local days when parsing does not provide a window', () => {
    const range = getAvailabilityRange(
      { scheduling_window_end: null, scheduling_window_start: null } as never,
      new Date('2026-07-27T09:00:00.000Z'),
    );

    expect(range.start.toISOString()).toBe('2026-07-27T09:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-08-03T09:00:00.000Z');
  });

  it('returns at most three gaps after event and task conflicts', () => {
    const openings = findOpenings({
      durationMinutes: 30,
      events: [event()],
      range: {
        end: new Date('2026-07-28T14:00:00.000Z'),
        start: new Date('2026-07-28T09:00:00.000Z'),
      },
      tasks: [
        task({
          scheduledStartAt: '2026-07-28T11:30:00.000Z',
          scheduledEndAt: '2026-07-28T12:00:00.000Z',
        }),
      ],
    });

    expect(openings).toHaveLength(3);
    expect(openings[0]).toEqual({
      start: '2026-07-28T09:00:00.000Z',
      end: '2026-07-28T09:30:00.000Z',
    });
  });
});

describe('event intent matching', () => {
  it('keeps same-title occurrences ambiguous instead of selecting the first one', () => {
    const candidates = findEventCandidates(
      [
        event(),
        event({
          id: 'event-2',
          startDate: '2026-07-29T10:00:00.000Z',
          endDate: '2026-07-29T11:00:00.000Z',
        }),
      ],
      'planning',
    );

    expect(candidates.map((candidate) => candidate.id)).toEqual(['event-1', 'event-2']);
  });
});
