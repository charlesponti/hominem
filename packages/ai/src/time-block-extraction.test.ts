import { describe, expect, it } from 'vitest';

import { normalizeExplicitWeekday, parseTimeBlockExtractionOutput } from './time-block-extraction';

describe('parseTimeBlockExtractionOutput', () => {
  it('preserves fixed event fields and explicit participants', () => {
    expect(
      parseTimeBlockExtractionOutput({
        primary_intent: 'add_event',
        title: 'Meeting with Sarah',
        target_title: null,
        participants: ['Sarah'],
        location: null,
        duration: 60,
        start_time: '2026-07-26T10:00:00-07:00',
        end_time: '2026-07-26T11:00:00-07:00',
        scheduling_window_start: null,
        scheduling_window_end: null,
        deadline_fixed: null,
        recurrence_rule: null,
      }),
    ).toMatchObject({
      primary_intent: 'add_event',
      duration: 60,
      start_time: '2026-07-26T10:00:00-07:00',
    });
  });

  it('accepts a flexible task with a resolved scheduling window', () => {
    const block = parseTimeBlockExtractionOutput({
      primary_intent: 'add_task',
      title: 'Write pitch deck',
      target_title: null,
      participants: null,
      location: null,
      duration: 120,
      start_time: null,
      end_time: null,
      scheduling_window_start: '2026-07-26T00:00:00-07:00',
      scheduling_window_end: '2026-07-27T00:00:00-07:00',
      deadline_fixed: null,
      recurrence_rule: null,
    });

    expect(block.start_time).toBeNull();
    expect(block.end_time).toBeNull();
    expect(block.scheduling_window_start).toBe('2026-07-26T00:00:00-07:00');
  });

  it('rejects unknown intents and malformed durations', () => {
    expect(() =>
      parseTimeBlockExtractionOutput({
        primary_intent: 'create_calendar_item',
        title: 'Gym',
        target_title: null,
        participants: null,
        location: null,
        duration: 'one hour',
        start_time: null,
        end_time: null,
        scheduling_window_start: null,
        scheduling_window_end: null,
        deadline_fixed: null,
        recurrence_rule: null,
      }),
    ).toThrow();
  });

  it('accepts edit, cancel, and recurring event metadata', () => {
    const edited = parseTimeBlockExtractionOutput({
      primary_intent: 'edit_event',
      title: 'planning meeting',
      target_title: 'planning meeting',
      participants: null,
      location: null,
      duration: 60,
      start_time: '2026-07-26T16:00:00-07:00',
      end_time: '2026-07-26T17:00:00-07:00',
      scheduling_window_start: null,
      scheduling_window_end: null,
      deadline_fixed: null,
      recurrence_rule: null,
    });
    expect(edited).toMatchObject({
      primary_intent: 'edit_event',
      target_title: 'planning meeting',
    });

    const recurring = parseTimeBlockExtractionOutput({
      primary_intent: 'add_recurring_event',
      title: 'team sync',
      target_title: null,
      participants: null,
      location: null,
      duration: 60,
      start_time: '2026-07-27T09:00:00-07:00',
      end_time: '2026-07-27T10:00:00-07:00',
      scheduling_window_start: null,
      scheduling_window_end: null,
      deadline_fixed: null,
      recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO',
    });
    expect(recurring).toMatchObject({
      primary_intent: 'add_recurring_event',
      recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO',
    });
  });

  it('resolves a corrected weekday from the reference date', () => {
    const block = parseTimeBlockExtractionOutput({
      primary_intent: 'add_event',
      title: null,
      target_title: null,
      participants: null,
      location: null,
      duration: 60,
      start_time: '2026-08-01T14:00:00-07:00',
      end_time: '2026-08-01T15:00:00-07:00',
      scheduling_window_start: null,
      scheduling_window_end: null,
      deadline_fixed: null,
      recurrence_rule: null,
    });

    expect(
      normalizeExplicitWeekday(block, {
        transcript: 'Schedule it tomorrow at 10, actually Friday at 2 PM',
        referenceDate: '2026-07-25T11:17:00-07:00',
        timezone: 'America/Los_Angeles',
      }),
    ).toMatchObject({
      start_time: '2026-07-31T14:00:00-07:00',
      end_time: '2026-07-31T15:00:00-07:00',
    });
  });
});
