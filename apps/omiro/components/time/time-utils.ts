import type { TaskListItem } from '@hominem/rpc/types';

import type { CalendarEvent } from '~/modules/on-device-ai';

import type { TimeBlock, TimeItem, TimeOpening, TimeStreamRow } from './time-types';

export const PAGE_DAYS = 30;
const DEFAULT_AVAILABILITY_DAYS = 7;

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function itemDate(item: TimeItem | TimeStreamRow) {
  if (item.kind !== 'task' && item.kind !== 'event') return null;
  return item.kind === 'task'
    ? (item.value.scheduledStartAt ?? item.value.dueAt)
    : item.value.startDate;
}

export function dayKey(item: TimeItem) {
  const date = new Date(itemDate(item) ?? 0);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function dayLabel(item: TimeItem) {
  const date = new Date(itemDate(item) ?? 0);
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'long' });
}

export function formatEventTime(event: CalendarEvent) {
  if (event.isAllDay) return 'All day';
  return `${new Date(event.startDate).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })} – ${new Date(event.endDate).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export function formatTaskTime(task: TaskListItem) {
  const date = task.scheduledStartAt ?? task.dueAt;
  if (!date) return 'Unscheduled';
  return new Date(date).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getScheduledTimeItems({
  events,
  loadedUntil,
  tasks,
}: {
  events: CalendarEvent[];
  loadedUntil: Date;
  tasks: TaskListItem[];
}): TimeItem[] {
  return [
    ...events.map((value) => ({ kind: 'event' as const, value })),
    ...tasks
      .filter((value) => value.scheduledStartAt ?? value.dueAt)
      .map((value) => ({ kind: 'task' as const, value })),
  ]
    .filter((item) => {
      const date = itemDate(item);
      return date ? new Date(date).getTime() < loadedUntil.getTime() : false;
    })
    .sort(
      (left, right) =>
        new Date(itemDate(left) ?? 0).getTime() - new Date(itemDate(right) ?? 0).getTime(),
    );
}

export function buildTimeStreamRows({
  events,
  loadedUntil,
  now = new Date(),
  tasks,
}: {
  events: CalendarEvent[];
  loadedUntil: Date;
  now?: Date;
  tasks: TaskListItem[];
}): TimeStreamRow[] {
  const scheduledItems = getScheduledTimeItems({ events, loadedUntil, tasks });
  const isPast = (item: TimeItem) => {
    const date = itemDate(item);
    if (!date) return false;
    if (item.kind === 'event') return new Date(item.value.endDate) <= now;
    return item.value.status === 'completed' || new Date(date) < now;
  };
  const visibleItems = scheduledItems.filter((item) => !isPast(item));
  const firstFutureIndex = visibleItems.findIndex((item) => {
    const date = itemDate(item);
    return date ? new Date(date) >= now : false;
  });
  return [
    ...visibleItems.slice(0, firstFutureIndex === -1 ? visibleItems.length : firstFutureIndex),
    ...visibleItems.slice(firstFutureIndex === -1 ? visibleItems.length : firstFutureIndex),
  ];
}

export function getUnscheduledTasks(tasks: TaskListItem[]) {
  return tasks.filter(
    (task) => !task.scheduledStartAt && !task.dueAt && task.status !== 'completed',
  );
}

export function getAvailabilityRange(block: TimeBlock, now = new Date()) {
  const start = block.scheduling_window_start
    ? new Date(block.scheduling_window_start)
    : new Date(now);
  const end = block.scheduling_window_end
    ? new Date(block.scheduling_window_end)
    : new Date(start.getTime() + DEFAULT_AVAILABILITY_DAYS * 24 * 60 * 60 * 1000);
  return { start, end };
}

export function findOpenings({
  events,
  range,
  tasks,
  durationMinutes,
}: {
  durationMinutes: number;
  events: CalendarEvent[];
  range: { end: Date; start: Date };
  tasks: TaskListItem[];
}): TimeOpening[] {
  const busy = [
    ...events.map((event) => ({ end: new Date(event.endDate), start: new Date(event.startDate) })),
    ...tasks
      .filter((task) => task.scheduledStartAt && task.scheduledEndAt)
      .map((task) => ({
        end: new Date(task.scheduledEndAt!),
        start: new Date(task.scheduledStartAt!),
      })),
  ]
    .map(({ start, end }) => ({
      start: new Date(Math.max(start.getTime(), range.start.getTime())),
      end: new Date(Math.min(end.getTime(), range.end.getTime())),
    }))
    .filter(({ start, end }) => end > start)
    .sort((left, right) => left.start.getTime() - right.start.getTime());
  const openings: TimeOpening[] = [];
  let cursor = range.start;
  const durationMs = durationMinutes * 60 * 1000;

  for (const interval of busy) {
    if (interval.start.getTime() - cursor.getTime() >= durationMs) {
      openings.push({
        start: cursor.toISOString(),
        end: new Date(cursor.getTime() + durationMs).toISOString(),
      });
    }
    if (interval.end > cursor) cursor = interval.end;
    if (openings.length === 3) return openings;
  }

  if (range.end.getTime() - cursor.getTime() >= durationMs) {
    openings.push({
      start: cursor.toISOString(),
      end: new Date(cursor.getTime() + durationMs).toISOString(),
    });
  }
  return openings.slice(0, 3);
}

export function findEventCandidates(
  events: CalendarEvent[],
  targetTitle: string | null,
  now: Date = new Date(),
) {
  const normalizedTitle = targetTitle?.trim().toLocaleLowerCase();
  if (!normalizedTitle) return [];
  const nowMs = now.getTime();
  return events.filter(
    (event) =>
      event.title.trim().toLocaleLowerCase() === normalizedTitle &&
      new Date(event.endDate).getTime() >= nowMs,
  );
}

export function formatDraftDetails(timeBlock: TimeBlock | null) {
  if (!timeBlock) return '';
  return [
    timeBlock.start_time && timeBlock.end_time
      ? `${new Date(timeBlock.start_time).toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })} – ${new Date(timeBlock.end_time).toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        })}`
      : timeBlock.scheduling_window_start
        ? `${new Date(timeBlock.scheduling_window_start).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}${timeBlock.duration ? ` · ${timeBlock.duration} min` : ''}`
        : timeBlock.deadline_fixed
          ? `Due ${new Date(`${timeBlock.deadline_fixed}T12:00:00`).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}`
          : timeBlock.duration
            ? `Unscheduled · ${timeBlock.duration} min`
            : 'Unscheduled',
    timeBlock.location,
    timeBlock.participants?.join(', ') ?? null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
}
