import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import type { CalendarEvent, CalendarPermissionStatus } from '~/modules/on-device-ai';

import type { TimeEventGateway } from './time-event-gateway';
import { PAGE_DAYS, startOfToday } from './time-utils';

const DAY_MS = 24 * 60 * 60 * 1000;

export function mergeCalendarEvents(
  current: CalendarEvent[],
  incoming: CalendarEvent[],
): CalendarEvent[] {
  const existing = new Set(current.map((event) => `${event.id}:${event.startDate}`));

  return [
    ...current,
    ...incoming.filter((event) => !existing.has(`${event.id}:${event.startDate}`)),
  ];
}

export function getCalendarPage(
  loadedSince: Date,
  loadedUntil: Date,
  hasLoadedEvents: boolean,
): { end: Date; isInitialLoad: boolean; start: Date } {
  const isInitialLoad = !hasLoadedEvents && loadedSince.getTime() === loadedUntil.getTime();
  const start = isInitialLoad
    ? new Date(loadedSince.getTime() - PAGE_DAYS * DAY_MS)
    : new Date(loadedUntil);
  const end = new Date(start.getTime() + PAGE_DAYS * DAY_MS * (isInitialLoad ? 2 : 1));

  return { end, isInitialLoad, start };
}

interface UseTimeCalendarOptions {
  gateway: TimeEventGateway;
  onError: (message: string) => void;
}

export function useTimeCalendar({ gateway, onError }: UseTimeCalendarOptions) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadedSince, setLoadedSince] = useState(() => startOfToday());
  const [loadedUntil, setLoadedUntil] = useState(() => startOfToday());
  const [permission, setPermission] = useState<CalendarPermissionStatus | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    void gateway.getPermission().then(setPermission);
  }, [gateway]);

  const loadNextPage = useCallback(async () => {
    if (permission !== 'authorized' || loadingRef.current) return;

    loadingRef.current = true;
    setIsLoadingEvents(true);
    const { end, isInitialLoad, start } = getCalendarPage(
      loadedSince,
      loadedUntil,
      hasLoadedEvents,
    );

    try {
      const page = await gateway.listEvents(start.toISOString(), end.toISOString());
      setEvents((current) => mergeCalendarEvents(current, page));
      if (isInitialLoad) setLoadedSince(start);
      setLoadedUntil(end);
      setHasLoadedEvents(true);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to load scheduled events.');
    } finally {
      loadingRef.current = false;
      setIsLoadingEvents(false);
    }
  }, [gateway, hasLoadedEvents, loadedSince, loadedUntil, onError, permission]);

  useEffect(() => {
    if (permission !== 'authorized' || hasLoadedEvents || loadingRef.current) return;
    void loadNextPage();
  }, [hasLoadedEvents, loadNextPage, permission]);

  const connectCalendar = useCallback(async () => {
    if (permission === 'denied') {
      await Linking.openSettings();
      return;
    }
    setPermission(await gateway.requestPermission());
  }, [gateway, permission]);

  const reset = useCallback(() => {
    const start = startOfToday();
    setLoadedSince(start);
    setLoadedUntil(start);
    setEvents([]);
    setHasLoadedEvents(false);
  }, []);

  const addEvent = useCallback((event: CalendarEvent) => {
    setEvents((current) =>
      mergeCalendarEvents(current, [event]).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    );
  }, []);

  return {
    addEvent,
    connectCalendar,
    events,
    hasLoadedEvents,
    isLoadingEvents,
    loadedUntil,
    loadNextPage,
    permission,
    reset,
  };
}
