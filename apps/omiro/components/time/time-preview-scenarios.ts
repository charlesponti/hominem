import type { TaskListItem } from '@hominem/rpc/types';

import type { CalendarEvent } from '~/modules/on-device-ai';

/**
 * Dev-only fixture scenarios for previewing the Time stream's design across
 * states that are awkward to reproduce with a real calendar/task backend
 * (four weeks of overlapping events, tasks, and all-day entries, plus an
 * empty state). Picked from the header's dev menu (__DEV__ builds only) via
 * `useTimePreview()`. Never referenced in production code paths.
 */

const NOW = () => Date.now();
const HOUR = 3_600_000;

function at(hoursFromNow: number) {
  return new Date(NOW() + hoursFromNow * HOUR).toISOString();
}

function mockTask(
  overrides: Partial<TaskListItem> & Pick<TaskListItem, 'id' | 'title'>,
): TaskListItem {
  return {
    artifactType: 'task',
    completedAt: null,
    createdAt: at(-24),
    description: null,
    dueAt: null,
    durationMinutes: null,
    location: null,
    ownerUserId: 'preview-user',
    parentTaskId: null,
    priority: 'medium',
    schedulingWindowEndAt: null,
    schedulingWindowStartAt: null,
    scheduledEndAt: null,
    scheduledStartAt: null,
    status: 'pending',
    timeZone: null,
    updatedAt: at(-24),
    ...overrides,
  } as TaskListItem;
}

function mockEvent(
  overrides: Partial<CalendarEvent> & Pick<CalendarEvent, 'id' | 'title' | 'startDate' | 'endDate'>,
): CalendarEvent {
  return {
    calendarTitle: 'Work',
    isAllDay: false,
    isEditable: true,
    location: null,
    notes: null,
    participants: [],
    recurrenceDescription: null,
    ...overrides,
  };
}

export interface TimePreviewScenario {
  events: CalendarEvent[];
  id: string;
  label: string;
  tasks: TaskListItem[];
}

export function createTimePreviewScenarios(): TimePreviewScenario[] {
  const busyEvents = Array.from({ length: 28 }, (_, day) => {
    const dayOffset = day * 24;
    const events = [
      mockEvent({
        calendarTitle: day % 2 === 0 ? 'Work' : 'Personal',
        endDate: at(dayOffset + 10.25),
        id: `preview-busy-focus-${day + 1}`,
        location: day % 2 === 0 ? 'Room 4B' : 'Home office',
        startDate: at(dayOffset + 9),
        title: `Focus block · day ${day + 1}`,
      }),
      mockEvent({
        calendarTitle: 'Work',
        endDate: at(dayOffset + 11.5),
        id: `preview-busy-standup-${day + 1}`,
        location: 'Zoom',
        recurrenceDescription: 'Every weekday',
        startDate: at(dayOffset + 10.5),
        title: `Team standup · day ${day + 1}`,
      }),
      mockEvent({
        calendarTitle: 'Work',
        endDate: at(dayOffset + 12),
        id: `preview-busy-review-${day + 1}`,
        location: 'Room 4B',
        participants: ['Priya', 'Jon'],
        startDate: at(dayOffset + 10.5),
        title: `Design review · day ${day + 1}`,
      }),
      mockEvent({
        calendarTitle: 'Personal',
        endDate: at(dayOffset + 14),
        id: `preview-busy-lunch-${day + 1}`,
        location: day % 2 === 0 ? 'Tatel' : 'Home',
        startDate: at(dayOffset + 13),
        title: `Lunch · day ${day + 1}`,
      }),
    ];

    if (day % 3 === 0) {
      events.push(
        mockEvent({
          calendarTitle: 'Birthdays',
          endDate: at(dayOffset + 24),
          id: `preview-busy-allday-${day + 1}`,
          isAllDay: true,
          isEditable: false,
          recurrenceDescription: 'Yearly',
          startDate: at(dayOffset),
          title: day % 2 === 0 ? 'Company offsite' : "Anna's birthday",
        }),
      );
    }

    return events;
  }).flat();

  const busyTasks = [
    ...Array.from({ length: 28 }, (_, day) => {
      const dayOffset = day * 24;
      return [
        mockTask({
          durationMinutes: 45,
          id: `preview-busy-task-plan-${day + 1}`,
          priority: day % 4 === 0 ? 'high' : 'medium',
          scheduledStartAt: at(dayOffset + 8),
          title: `Plan the day · day ${day + 1}`,
        }),
        mockTask({
          dueAt: at(dayOffset + 16),
          id: `preview-busy-task-followup-${day + 1}`,
          title: `Follow up on actions · day ${day + 1}`,
        }),
      ];
    }).flat(),
    mockTask({
      id: 'preview-busy-task-unscheduled-1',
      location: 'Inbox',
      priority: 'high',
      title: 'Book dentist follow-up',
    }),
    mockTask({
      id: 'preview-busy-task-unscheduled-2',
      priority: 'low',
      title: 'Plan next month',
    }),
  ];

  return [
    {
      id: 'busy',
      label: 'Busy',
      events: busyEvents,
      tasks: busyTasks,
    },
    {
      id: 'empty',
      label: 'Empty (nothing scheduled)',
      events: [],
      tasks: [],
    },
  ];
}
