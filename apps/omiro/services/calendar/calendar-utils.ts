import type { CalendarEvent } from '~/modules/on-device-ai';

const DAY_MS = 24 * 60 * 60 * 1000;
export const CALENDAR_PAGE_DAYS = 30;

export function getCalendarPage(
  loadedSince: Date,
  loadedUntil: Date,
  hasLoadedEvents: boolean,
): { end: Date; isInitialLoad: boolean; start: Date } {
  const isInitialLoad = !hasLoadedEvents && loadedSince.getTime() === loadedUntil.getTime();
  const start = isInitialLoad
    ? new Date(loadedSince.getTime() - CALENDAR_PAGE_DAYS * DAY_MS)
    : new Date(loadedUntil);
  const end = new Date(start.getTime() + CALENDAR_PAGE_DAYS * DAY_MS * (isInitialLoad ? 2 : 1));
  return { end, isInitialLoad, start };
}

export function mergeCalendarEvents(
  current: CalendarEvent[],
  incoming: CalendarEvent[],
): CalendarEvent[] {
  const events = new Map(current.map((event) => [`${event.id}:${event.startDate}`, event]));
  for (const event of incoming) events.set(`${event.id}:${event.startDate}`, event);
  return [...events.values()].sort((left, right) => left.startDate.localeCompare(right.startDate));
}
