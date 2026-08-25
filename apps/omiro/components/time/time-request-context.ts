import type { CalendarEvent } from '~/modules/on-device-ai';

export function buildCalendarContext(
  events: CalendarEvent[],
  tasks: { dueAt?: string | null; scheduledStartAt?: string | null; title: string }[],
) {
  const lines = events.map((event) => `${event.title} at ${event.startDate}–${event.endDate}`);
  for (const task of tasks) {
    const scheduledAt = task.scheduledStartAt ?? task.dueAt;
    if (scheduledAt) lines.push(`${task.title} at ${scheduledAt}`);
  }
  return lines.join('\n').slice(0, 19000);
}
