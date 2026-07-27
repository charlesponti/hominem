import type { TaskListItem, TasksParseOutput } from '@hominem/rpc/types';

import type { CalendarEvent, CalendarPermissionStatus } from '~/modules/on-device-ai';

export type TimeItem =
  | { kind: 'event'; value: CalendarEvent }
  | { kind: 'task'; value: TaskListItem };

export type TimeStreamRow =
  | TimeItem
  | { kind: 'section'; id: 'earlier' | 'unscheduled'; count?: number }
  | { kind: 'now' }
  | { kind: 'permission-notice'; status: Exclude<CalendarPermissionStatus, 'authorized'> };

export type TimeBlock = TasksParseOutput['block'];

export type EditableTimeBlockField =
  | 'title'
  | 'target_title'
  | 'participants'
  | 'location'
  | 'duration'
  | 'start_time'
  | 'end_time'
  | 'scheduling_window_start'
  | 'scheduling_window_end'
  | 'deadline_fixed'
  | 'recurrence_rule';

export type TimeInteractionState =
  | { kind: 'idle' }
  | { kind: 'parsing'; submittedPrompt: string }
  | { kind: 'draft'; block: TimeBlock; submittedPrompt: string }
  | { kind: 'answer'; answer: string }
  | { kind: 'availability'; block: TimeBlock; openings: TimeOpening[]; submittedPrompt: string }
  | { kind: 'event-choice'; candidates: CalendarEvent[]; submittedPrompt: string }
  | { kind: 'error'; message: string; submittedPrompt: string };

export interface TimeOpening {
  end: string;
  start: string;
}
