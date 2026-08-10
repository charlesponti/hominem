import type { CalendarEvent } from '~/modules/on-device-ai';

export function buildCalendarContext(
  events: CalendarEvent[],
  tasks: { dueAt?: string | null; scheduledStartAt?: string | null; title: string }[],
) {
  return [
    ...events.map((event) => `${event.title} at ${event.startDate}–${event.endDate}`),
    ...tasks
      .filter((task) => task.scheduledStartAt ?? task.dueAt)
      .map((task) => `${task.title} at ${task.scheduledStartAt ?? task.dueAt}`),
  ]
    .join('\n')
    .slice(0, 19000);
}
