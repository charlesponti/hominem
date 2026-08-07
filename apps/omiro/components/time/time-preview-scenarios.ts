import type { TaskListItem } from '@hominem/rpc/types';

import type { CalendarEvent } from '~/modules/on-device-ai';

/**
 * Dev-only fixture scenarios for previewing the Time stream's design across
 * states that are awkward to reproduce with a real calendar/task backend
 * (multiple events per day, overlapping times, empty state, all-day-heavy
 * days). Picked from the header's dev menu (__DEV__ builds only) via
 * `useTimePreview()`. Never referenced in production code paths.
 */

const NOW = () => Date.now();
const HOUR = 3_600_000;

function at(hoursFromNow: number) {
  return new Date(NOW() + hoursFromNow * HOUR).toISOString();
}

function mockTask(overrides: Partial<TaskListItem> & Pick<TaskListItem, 'id' | 'title'>): TaskListItem {
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

export const timePreviewScenarios: TimePreviewScenario[] = [
  {
    id: 'busy-day',
    label: 'Busy day (overlaps + tasks)',
    events: [
      mockEvent({
        calendarTitle: 'Work',
        endDate: at(36),
        id: 'preview-offsite',
        isAllDay: true,
        startDate: at(12),
        title: 'Company Offsite',
      }),
      mockEvent({
        calendarTitle: 'Work',
        endDate: at(0.75),
        id: 'preview-standup',
        location: 'Zoom',
        recurrenceDescription: 'Every weekday',
        startDate: at(0.5),
        title: 'Team Standup',
      }),
      mockEvent({
        calendarTitle: 'Work',
        endDate: at(1.5),
        id: 'preview-design-review',
        location: 'Room 4B',
        participants: ['Priya', 'Jon'],
        startDate: at(0.5),
        title: 'Design Review',
      }),
      mockEvent({
        calendarTitle: 'Work',
        endDate: at(2.5),
        id: 'preview-1-1',
        participants: ['Sam'],
        startDate: at(2),
        title: '1:1 with Sam',
      }),
      mockEvent({
        calendarTitle: 'Personal',
        endDate: at(4.5),
        id: 'preview-lunch',
        location: 'Tatel',
        startDate: at(3.5),
        title: 'Lunch with Maya',
      }),
      mockEvent({
        calendarTitle: 'Personal',
        endDate: at(7),
        id: 'preview-dentist',
        location: 'Dr. Chen',
        startDate: at(6),
        title: 'Dentist Appointment',
      }),
      mockEvent({
        calendarTitle: 'Travel',
        endDate: at(27),
        id: 'preview-flight',
        isEditable: false,
        location: 'SFO',
        startDate: at(24),
        title: 'Flight to SF',
      }),
      mockEvent({
        calendarTitle: 'Work',
        endDate: at(29),
        id: 'preview-board',
        location: 'HQ',
        participants: ['Board'],
        startDate: at(27),
        title: 'Board Meeting',
      }),
      mockEvent({
        calendarTitle: 'Birthdays',
        endDate: at(48),
        id: 'preview-birthday',
        isAllDay: true,
        isEditable: false,
        recurrenceDescription: 'Yearly',
        startDate: at(24),
        title: "Anna's Birthday",
      }),
    ],
    tasks: [
      mockTask({
        id: 'preview-task-email',
        location: 'Inbox',
        priority: 'high',
        scheduledStartAt: at(0.6),
        title: 'Reply to client email',
      }),
      mockTask({
        dueAt: at(9),
        id: 'preview-task-expense',
        title: 'Submit expense report',
      }),
      mockTask({
        durationMinutes: 45,
        id: 'preview-task-slides',
        priority: 'high',
        scheduledStartAt: at(26),
        title: 'Prepare slides for board meeting',
      }),
      mockTask({
        id: 'preview-task-unscheduled',
        priority: 'low',
        title: 'Book dentist follow-up',
      }),
    ],
  },
  {
    id: 'overlap-heavy',
    label: 'Overlap-heavy (5 at once)',
    events: [1, 2, 3, 4, 5].map((n) =>
      mockEvent({
        calendarTitle: ['Work', 'Personal', 'Travel', 'Birthdays', 'Work'][n - 1],
        endDate: at(1 + n * 0.25),
        id: `preview-overlap-${n}`,
        participants: [],
        startDate: at(1),
        title: `Overlapping meeting ${n}`,
      }),
    ),
    tasks: [],
  },
  {
    id: 'all-day-heavy',
    label: 'All-day heavy',
    events: [0, 1, 2].map((n) =>
      mockEvent({
        calendarTitle: ['Work', 'Personal', 'Birthdays'][n],
        endDate: at(24 * (n + 1) + 23),
        id: `preview-allday-${n}`,
        isAllDay: true,
        startDate: at(24 * n),
        title: ['Company Offsite', "Anna's Birthday", 'Yom Kippur'][n],
      }),
    ),
    tasks: [],
  },
  {
    id: 'empty',
    label: 'Empty (nothing scheduled)',
    events: [],
    tasks: [],
  },
];
