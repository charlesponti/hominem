// @vitest-environment jsdom
import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockGetPermission = vi.fn();
const mockRequestPermission = vi.fn();
const mockListEvents = vi.fn();
const mockGetEvent = vi.fn();
const mockCreateEvent = vi.fn();
const mockUpdateEvent = vi.fn();
const mockDeleteEvent = vi.fn();
const mockOpenSettings = vi.fn();

vi.mock('~/services/calendar/calendar-event-gateway', () => ({
  calendarEventGateway: {
    getPermission: mockGetPermission,
    requestPermission: mockRequestPermission,
    listEvents: mockListEvents,
    getEvent: mockGetEvent,
    createEvent: mockCreateEvent,
    updateEvent: mockUpdateEvent,
    deleteEvent: mockDeleteEvent,
  },
}));

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>();
  return { ...actual, Linking: { openSettings: mockOpenSettings } };
});

const {
  calendarKeys,
  useCalendarEvent,
  useCalendarEvents,
  useCalendarPermission,
  useConnectCalendar,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} = await import('~/services/calendar/calendar-queries');

function makeEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    calendarTitle: 'Home',
    endDate: '2026-08-14T11:00:00.000Z',
    id: 'event-1',
    isAllDay: false,
    isEditable: true,
    location: null,
    notes: null,
    participants: [],
    recurrenceDescription: null,
    startDate: '2026-08-14T10:00:00.000Z',
    title: 'Standup',
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useCalendarPermission', () => {
  it('fetches the current permission status', async () => {
    mockGetPermission.mockResolvedValueOnce('authorized');

    const { result } = renderHookWithQueryClient(() => useCalendarPermission());

    await waitFor(() => expect(result.current.data).toBe('authorized'));
  });

  it('does not fetch when disabled', () => {
    renderHookWithQueryClient(() => useCalendarPermission({ enabled: false }));

    expect(mockGetPermission).not.toHaveBeenCalled();
  });
});

describe('useCalendarEvents', () => {
  it('loads the initial page of events', async () => {
    const event = makeEvent();
    mockListEvents.mockResolvedValueOnce([event]);

    const { result } = renderHookWithQueryClient(() => useCalendarEvents());

    await waitFor(() => expect(result.current.hasLoadedEvents).toBe(true));
    expect(result.current.events).toEqual([event]);
    expect(mockListEvents).toHaveBeenCalledTimes(1);
  });

  it('loads and merges the next page when loadNextPage is called', async () => {
    mockListEvents.mockResolvedValueOnce([makeEvent({ id: 'event-1' })]);
    const { result } = renderHookWithQueryClient(() => useCalendarEvents());
    await waitFor(() => expect(result.current.hasLoadedEvents).toBe(true));

    mockListEvents.mockResolvedValueOnce([
      makeEvent({ id: 'event-2', startDate: '2026-09-20T10:00:00.000Z' }),
    ]);

    await act(async () => {
      await result.current.loadNextPage();
    });

    await waitFor(() => expect(result.current.events).toHaveLength(2));
    expect(mockListEvents).toHaveBeenCalledTimes(2);
  });

  it('refresh resets the events query', async () => {
    mockListEvents.mockResolvedValueOnce([makeEvent()]);
    const { result } = renderHookWithQueryClient(() => useCalendarEvents());
    await waitFor(() => expect(result.current.hasLoadedEvents).toBe(true));

    mockListEvents.mockResolvedValueOnce([makeEvent()]);
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockListEvents).toHaveBeenCalledTimes(2);
  });
});

describe('useCalendarEvent', () => {
  it('fetches a single event by id', async () => {
    mockGetEvent.mockResolvedValueOnce(makeEvent({ id: 'event-42' }));

    const { result } = renderHookWithQueryClient(() => useCalendarEvent({ id: 'event-42' }));

    await waitFor(() => expect(result.current.data).toEqual(makeEvent({ id: 'event-42' })));
    expect(mockGetEvent).toHaveBeenCalledWith('event-42');
  });
});

describe('useConnectCalendar', () => {
  it('opens settings instead of requesting permission when previously denied', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useConnectCalendar());
    queryClient.setQueryData(calendarKeys.permission, 'denied');

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('requests permission and caches the result when authorized', async () => {
    mockRequestPermission.mockResolvedValueOnce('authorized');
    const { result, queryClient } = renderHookWithQueryClient(() => useConnectCalendar());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(queryClient.getQueryData(calendarKeys.permission)).toBe('authorized');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: calendarKeys.events });
  });

  it('does not invalidate events when permission is requested but not granted', async () => {
    mockRequestPermission.mockResolvedValueOnce('denied');
    const { result, queryClient } = renderHookWithQueryClient(() => useConnectCalendar());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(queryClient.getQueryData(calendarKeys.permission)).toBe('denied');
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe('useCreateCalendarEvent', () => {
  it('creates an event and writes it into the events cache and detail cache', async () => {
    const created = makeEvent({ id: 'event-new' });
    mockCreateEvent.mockResolvedValueOnce(created);
    const { result, queryClient } = renderHookWithQueryClient(() => useCreateCalendarEvent());

    await act(async () => {
      await result.current.mutateAsync({
        endDate: created.endDate,
        location: null,
        startDate: created.startDate,
        title: created.title,
      });
    });

    expect(mockCreateEvent).toHaveBeenCalledWith(
      created.title,
      created.startDate,
      created.endDate,
      null,
      undefined,
    );
    expect(queryClient.getQueryData(calendarKeys.detail('event-new'))).toEqual(created);
  });
});

describe('useUpdateCalendarEvent', () => {
  it('updates an event and invalidates the events query', async () => {
    const updated = makeEvent({ id: 'event-1', title: 'Renamed' });
    mockUpdateEvent.mockResolvedValueOnce(updated);
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateCalendarEvent());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({
        id: 'event-1',
        patch: { title: 'Renamed' },
        recurrenceScope: 'thisEvent',
      });
    });

    expect(mockUpdateEvent).toHaveBeenCalledWith('event-1', { title: 'Renamed' }, 'thisEvent');
    expect(queryClient.getQueryData(calendarKeys.detail('event-1'))).toEqual(updated);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: calendarKeys.events });
  });
});

describe('useDeleteCalendarEvent', () => {
  it('removes the event from the detail cache and invalidates the events query', async () => {
    mockDeleteEvent.mockResolvedValueOnce(undefined);
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteCalendarEvent());
    queryClient.setQueryData(calendarKeys.detail('event-1'), makeEvent({ id: 'event-1' }));
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({ id: 'event-1', recurrenceScope: 'thisEvent' });
    });

    expect(mockDeleteEvent).toHaveBeenCalledWith('event-1', 'thisEvent');
    expect(queryClient.getQueryData(calendarKeys.detail('event-1'))).toBeUndefined();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: calendarKeys.events });
  });
});
