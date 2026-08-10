import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Linking } from 'react-native';

import type {
  CalendarEvent,
  CalendarEventPatch,
  CalendarPermissionStatus,
  CalendarRecurrenceScope,
} from '~/modules/on-device-ai';

import { calendarEventGateway } from './calendar-event-gateway';
import { CALENDAR_PAGE_DAYS, getCalendarPage, mergeCalendarEvents } from './calendar-utils';

export { CALENDAR_PAGE_DAYS, getCalendarPage, mergeCalendarEvents } from './calendar-utils';

interface CalendarPage {
  end: string;
  events: CalendarEvent[];
  start: string;
}

export const calendarKeys = {
  all: ['calendar'] as const,
  detail: (id: string) => ['calendar', 'detail', id] as const,
  events: ['calendar', 'events'] as const,
  permission: ['calendar', 'permission'] as const,
};

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function initialPage(): CalendarPage {
  const today = startOfToday();
  const { end, start } = getCalendarPage(today, today, false);
  return { end: end.toISOString(), events: [], start: start.toISOString() };
}

function nextPage(page: CalendarPage): CalendarPage {
  const start = new Date(page.end);
  const end = new Date(start.getTime() + CALENDAR_PAGE_DAYS * 24 * 60 * 60 * 1000);
  return { end: end.toISOString(), events: [], start: start.toISOString() };
}

function replaceCachedEvent(
  data: InfiniteData<CalendarPage> | undefined,
  event: CalendarEvent,
): InfiniteData<CalendarPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      events: mergeCalendarEvents(
        page.events.filter((candidate) => candidate.id !== event.id),
        event.startDate < page.end && event.endDate > page.start ? [event] : [],
      ),
    })),
  };
}

export function useCalendarPermission({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    enabled,
    queryFn: () => calendarEventGateway.getPermission(),
    queryKey: calendarKeys.permission,
  });
}

export function useCalendarEvents({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery<
    CalendarPage,
    Error,
    InfiniteData<CalendarPage>,
    typeof calendarKeys.events,
    CalendarPage
  >({
    enabled,
    getNextPageParam: (lastPage) => nextPage(lastPage),
    initialPageParam: initialPage(),
    queryFn: async ({ pageParam }) => ({
      ...pageParam,
      events: await calendarEventGateway.listEvents(pageParam.start, pageParam.end),
    }),
    queryKey: calendarKeys.events,
  });
  const events = useMemo(
    () => mergeCalendarEvents([], query.data?.pages.flatMap((page) => page.events) ?? []),
    [query.data],
  );
  const loadedUntil = query.data?.pages.at(-1)?.end ?? null;
  const refresh = useCallback(async () => {
    await queryClient.resetQueries({ queryKey: calendarKeys.events });
  }, [queryClient]);

  return {
    ...query,
    events,
    hasLoadedEvents: query.isSuccess,
    isLoadingEvents: query.isFetching,
    loadedUntil: loadedUntil ? new Date(loadedUntil) : startOfToday(),
    loadNextPage: query.fetchNextPage,
    refresh,
  };
}

export function useConnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const permission = queryClient.getQueryData<CalendarPermissionStatus>(
        calendarKeys.permission,
      );
      if (permission === 'denied') {
        await Linking.openSettings();
        return null;
      }
      return calendarEventGateway.requestPermission();
    },
    onSuccess: (permission) => {
      if (!permission) return;
      queryClient.setQueryData(calendarKeys.permission, permission);
      if (permission === 'authorized') {
        void queryClient.invalidateQueries({ queryKey: calendarKeys.events });
      }
    },
  });
}

export function useCalendarEvent({ enabled = true, id }: { enabled?: boolean; id: string }) {
  return useQuery({
    enabled,
    queryFn: () => calendarEventGateway.getEvent(id),
    queryKey: calendarKeys.detail(id),
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      endDate,
      location,
      recurrenceRule,
      startDate,
      title,
    }: {
      endDate: string;
      location: string | null;
      recurrenceRule?: string | null;
      startDate: string;
      title: string;
    }) => calendarEventGateway.createEvent(title, startDate, endDate, location, recurrenceRule),
    onSuccess: (event) => {
      queryClient.setQueryData<InfiniteData<CalendarPage>>(calendarKeys.events, (data) =>
        replaceCachedEvent(data, event),
      );
      queryClient.setQueryData(calendarKeys.detail(event.id), event);
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
      recurrenceScope,
    }: {
      id: string;
      patch: CalendarEventPatch;
      recurrenceScope: CalendarRecurrenceScope;
    }) => calendarEventGateway.updateEvent(id, patch, recurrenceScope),
    onSuccess: (event) => {
      queryClient.setQueryData<InfiniteData<CalendarPage>>(calendarKeys.events, (data) =>
        replaceCachedEvent(data, event),
      );
      queryClient.setQueryData(calendarKeys.detail(event.id), event);
      void queryClient.invalidateQueries({ queryKey: calendarKeys.events });
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      recurrenceScope,
    }: {
      id: string;
      recurrenceScope: CalendarRecurrenceScope;
    }) => calendarEventGateway.deleteEvent(id, recurrenceScope),
    onSuccess: (_value, { id }) => {
      queryClient.setQueryData<InfiniteData<CalendarPage>>(calendarKeys.events, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            events: page.events.filter((event) => event.id !== id),
          })),
        };
      });
      queryClient.removeQueries({ queryKey: calendarKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: calendarKeys.events });
    },
  });
}
