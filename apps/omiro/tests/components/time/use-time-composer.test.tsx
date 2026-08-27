// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockResolveTimeRequest = vi.fn();
const mockCreateTaskMutateAsync = vi.fn();
const mockCreateEventMutateAsync = vi.fn();
const mockParseTimeBlockMutateAsync = vi.fn();
let mockPermissionData: string | null = 'authorized';
let mockCreateTaskPending = false;
let mockCreateEventPending = false;

vi.mock('expo-router', () => ({
  useIsFocused: () => true,
}));

vi.mock('~/services/calendar/calendar-event-gateway', () => ({
  calendarEventGateway: {},
}));

vi.mock('~/services/calendar/calendar-queries', () => ({
  useCalendarPermission: () => ({ data: mockPermissionData }),
  useCalendarEvents: () => ({ events: [] }),
  useCreateCalendarEvent: () => ({
    mutateAsync: mockCreateEventMutateAsync,
    isPending: mockCreateEventPending,
  }),
}));

vi.mock('~/services/tasks/use-task-create', () => ({
  useTaskCreate: () => ({
    mutateAsync: mockCreateTaskMutateAsync,
    isPending: mockCreateTaskPending,
  }),
}));

vi.mock('~/services/tasks/use-tasks-query', () => ({
  useTasksQuery: () => ({ data: [] }),
}));

vi.mock('~/services/tasks/use-time-block-parse', () => ({
  useTimeBlockParse: () => ({ mutateAsync: mockParseTimeBlockMutateAsync }),
}));

vi.mock('~/components/time/time-request', () => ({
  resolveTimeRequest: (...args: unknown[]) => mockResolveTimeRequest(...args),
}));

const { useTimeComposer } = await import('~/components/time/use-time-composer');

function blockFixture(overrides: Record<string, unknown> = {}) {
  return {
    primary_intent: 'add_task',
    title: 'Buy milk',
    target_title: null,
    participants: null,
    location: null,
    start_time: null,
    end_time: null,
    scheduling_window_start: null,
    scheduling_window_end: null,
    deadline_fixed: null,
    recurrence_rule: null,
    duration: null,
    ...overrides,
  };
}

describe('useTimeComposer', () => {
  beforeEach(() => {
    mockPermissionData = 'authorized';
    mockCreateTaskPending = false;
    mockCreateEventPending = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when asked with an empty (whitespace-only) prompt', async () => {
    const onError = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError, onOpenEvent: vi.fn() }),
    );

    act(() => {
      result.current.setPrompt('   ');
    });
    await act(async () => {
      await result.current.ask();
    });

    expect(mockResolveTimeRequest).not.toHaveBeenCalled();
  });

  it('moves through the parsing state and lands on a draft interaction', async () => {
    mockResolveTimeRequest.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ kind: 'draft', block: blockFixture(), submittedPrompt: 'buy milk' }),
            0,
          ),
        ),
    );
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent: vi.fn() }),
    );

    act(() => {
      result.current.setPrompt('buy milk');
    });

    let askPromise: Promise<void> | undefined;
    act(() => {
      askPromise = result.current.ask();
    });
    expect(result.current.interaction.kind).toBe('parsing');
    expect(result.current.prompt).toBe('buy milk');

    await act(async () => {
      await askPromise;
    });

    expect(result.current.interaction).toEqual({
      kind: 'draft',
      block: blockFixture(),
      submittedPrompt: 'buy milk',
    });
    expect(result.current.prompt).toBe('');
  });

  it('ignores ask() while already parsing', async () => {
    mockResolveTimeRequest.mockReturnValue(new Promise(() => {}));
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent: vi.fn() }),
    );

    act(() => {
      result.current.setPrompt('buy milk');
    });
    act(() => {
      void result.current.ask();
    });
    expect(result.current.interaction.kind).toBe('parsing');

    act(() => {
      void result.current.ask();
    });

    expect(mockResolveTimeRequest).toHaveBeenCalledTimes(1);
  });

  it('restores the prompt, resets to idle, and calls onError on an error result', async () => {
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'error',
      message: 'Something went wrong',
      submittedPrompt: 'buy milk',
    });
    const onError = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError, onOpenEvent: vi.fn() }),
    );

    act(() => {
      result.current.setPrompt('buy milk');
    });
    await act(async () => {
      await result.current.ask();
    });

    expect(onError).toHaveBeenCalledWith('Something went wrong');
    expect(result.current.interaction).toEqual({ kind: 'idle' });
    expect(result.current.prompt).toBe('buy milk');
  });

  it('opens the event and resets to idle on an open-event result', async () => {
    const event = { id: 'event-1', title: 'Planning' };
    mockResolveTimeRequest.mockResolvedValueOnce({ kind: 'open-event', event });
    const onOpenEvent = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent }),
    );

    act(() => {
      result.current.setPrompt('open planning');
    });
    await act(async () => {
      await result.current.ask();
    });

    expect(onOpenEvent).toHaveBeenCalledWith(event);
    expect(result.current.interaction).toEqual({ kind: 'idle' });
  });

  it('converts an availability opening choice into a draft interaction', async () => {
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'availability',
      block: blockFixture({ primary_intent: 'schedule_gap_fill' }),
      openings: [{ start: '2026-08-14T10:00:00.000Z', end: '2026-08-14T11:00:00.000Z' }],
      submittedPrompt: 'find time',
    });
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent: vi.fn() }),
    );
    act(() => {
      result.current.setPrompt('find time');
    });
    await act(async () => {
      await result.current.ask();
    });
    expect(result.current.interaction.kind).toBe('availability');

    act(() => {
      result.current.chooseOpening({
        start: '2026-08-14T10:00:00.000Z',
        end: '2026-08-14T11:00:00.000Z',
      });
    });

    expect(result.current.interaction).toMatchObject({
      kind: 'draft',
      block: expect.objectContaining({
        start_time: '2026-08-14T10:00:00.000Z',
        end_time: '2026-08-14T11:00:00.000Z',
        primary_intent: 'add_event',
      }),
      submittedPrompt: 'find time',
    });
  });

  it('ignores chooseOpening outside the availability state', () => {
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent: vi.fn() }),
    );

    act(() => {
      result.current.chooseOpening({ start: 'a', end: 'b' });
    });

    expect(result.current.interaction).toEqual({ kind: 'idle' });
  });

  it('opens the chosen candidate event and resets to idle on chooseEvent', async () => {
    const candidate = { id: 'event-1', title: 'Planning' };
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'event-choice',
      candidates: [candidate],
      submittedPrompt: 'cancel planning',
    });
    const onOpenEvent = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent }),
    );
    act(() => {
      result.current.setPrompt('cancel planning');
    });
    await act(async () => {
      await result.current.ask();
    });

    act(() => {
      result.current.chooseEvent('event-1');
    });

    expect(onOpenEvent).toHaveBeenCalledWith(candidate);
    expect(result.current.interaction).toEqual({ kind: 'idle' });
  });

  it('ignores chooseEvent for an unknown candidate id', async () => {
    const candidate = { id: 'event-1', title: 'Planning' };
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'event-choice',
      candidates: [candidate],
      submittedPrompt: 'cancel planning',
    });
    const onOpenEvent = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent }),
    );
    act(() => {
      result.current.setPrompt('cancel planning');
    });
    await act(async () => {
      await result.current.ask();
    });

    act(() => {
      result.current.chooseEvent('unknown-id');
    });

    expect(onOpenEvent).not.toHaveBeenCalled();
    expect(result.current.interaction.kind).toBe('event-choice');
  });

  it('updates a draft field via updateDraft, normalizing an empty value to null', async () => {
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'draft',
      block: blockFixture(),
      submittedPrompt: 'buy milk',
    });
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent: vi.fn() }),
    );
    act(() => {
      result.current.setPrompt('buy milk');
    });
    await act(async () => {
      await result.current.ask();
    });

    act(() => {
      result.current.updateDraft('location', 'Home');
    });
    expect(result.current.interaction).toMatchObject({
      block: expect.objectContaining({ location: 'Home' }),
    });

    act(() => {
      result.current.updateDraft('location', '');
    });
    expect(result.current.interaction).toMatchObject({
      block: expect.objectContaining({ location: null }),
    });
  });

  it('fails submitDraft when the title is blank', async () => {
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'draft',
      block: blockFixture({ title: '   ' }),
      submittedPrompt: 'buy milk',
    });
    const onError = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError, onOpenEvent: vi.fn() }),
    );
    act(() => {
      result.current.setPrompt('buy milk');
    });
    await act(async () => {
      await result.current.ask();
    });

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(onError).toHaveBeenCalledWith('Add a title before saving this time block.');
    expect(mockCreateTaskMutateAsync).not.toHaveBeenCalled();
    expect(result.current.interaction).toEqual({ kind: 'idle' });
  });

  it('creates a task on submitDraft for an add_task block and returns to idle', async () => {
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'draft',
      block: blockFixture({ duration: 30, location: 'Home' }),
      submittedPrompt: 'buy milk',
    });
    mockCreateTaskMutateAsync.mockResolvedValueOnce(undefined);
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent: vi.fn() }),
    );
    act(() => {
      result.current.setPrompt('buy milk');
    });
    await act(async () => {
      await result.current.ask();
    });

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(mockCreateTaskMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Buy milk', durationMinutes: 30, location: 'Home' }),
    );
    expect(result.current.interaction).toEqual({ kind: 'idle' });
  });

  it('requires calendar permission before creating an event on submitDraft', async () => {
    mockPermissionData = 'denied';
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'draft',
      block: blockFixture({
        primary_intent: 'add_event',
        start_time: '2026-08-14T10:00:00.000Z',
        end_time: '2026-08-14T11:00:00.000Z',
      }),
      submittedPrompt: 'meeting',
    });
    const onError = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError, onOpenEvent: vi.fn() }),
    );
    act(() => {
      result.current.setPrompt('meeting');
    });
    await act(async () => {
      await result.current.ask();
    });

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(onError).toHaveBeenCalledWith('Connect your iOS Calendar before adding an event.');
    expect(mockCreateEventMutateAsync).not.toHaveBeenCalled();
  });

  it('requires a start and end time before creating an event on submitDraft', async () => {
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'draft',
      block: blockFixture({ primary_intent: 'add_event', start_time: null, end_time: null }),
      submittedPrompt: 'meeting',
    });
    const onError = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError, onOpenEvent: vi.fn() }),
    );
    act(() => {
      result.current.setPrompt('meeting');
    });
    await act(async () => {
      await result.current.ask();
    });

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(onError).toHaveBeenCalledWith('Choose a start and end time before adding this event.');
    expect(mockCreateEventMutateAsync).not.toHaveBeenCalled();
  });

  it('creates a calendar event on submitDraft when authorized with a valid range', async () => {
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'draft',
      block: blockFixture({
        primary_intent: 'add_event',
        start_time: '2026-08-14T10:00:00.000Z',
        end_time: '2026-08-14T11:00:00.000Z',
      }),
      submittedPrompt: 'meeting',
    });
    mockCreateEventMutateAsync.mockResolvedValueOnce(undefined);
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent: vi.fn() }),
    );
    act(() => {
      result.current.setPrompt('meeting');
    });
    await act(async () => {
      await result.current.ask();
    });

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(mockCreateEventMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2026-08-14T10:00:00.000Z',
        endDate: '2026-08-14T11:00:00.000Z',
        title: 'Buy milk',
      }),
    );
    expect(result.current.interaction).toEqual({ kind: 'idle' });
  });

  it('fails submitDraft with a generic message for an unsupported intent', async () => {
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'draft',
      block: blockFixture({ primary_intent: 'search' }),
      submittedPrompt: 'something',
    });
    const onError = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError, onOpenEvent: vi.fn() }),
    );
    act(() => {
      result.current.setPrompt('something');
    });
    await act(async () => {
      await result.current.ask();
    });

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(onError).toHaveBeenCalledWith('Review this request before making a change.');
  });

  it('fails submitDraft with the thrown error message when the mutation rejects', async () => {
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'draft',
      block: blockFixture(),
      submittedPrompt: 'buy milk',
    });
    mockCreateTaskMutateAsync.mockRejectedValueOnce(new Error('server exploded'));
    const onError = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError, onOpenEvent: vi.fn() }),
    );
    act(() => {
      result.current.setPrompt('buy milk');
    });
    await act(async () => {
      await result.current.ask();
    });

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(onError).toHaveBeenCalledWith('server exploded');
  });

  it('ignores submitDraft outside the draft state', async () => {
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent: vi.fn() }),
    );

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(mockCreateTaskMutateAsync).not.toHaveBeenCalled();
    expect(mockCreateEventMutateAsync).not.toHaveBeenCalled();
  });

  it('resets an availability or event-choice interaction to idle with the prompt restored on cancelResult', async () => {
    mockResolveTimeRequest.mockResolvedValueOnce({
      kind: 'event-choice',
      candidates: [],
      submittedPrompt: 'cancel planning',
    });
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent: vi.fn() }),
    );
    act(() => {
      result.current.setPrompt('cancel planning');
    });
    await act(async () => {
      await result.current.ask();
    });

    act(() => {
      result.current.cancelResult();
    });

    expect(result.current.interaction).toEqual({ kind: 'idle' });
    expect(result.current.prompt).toBe('cancel planning');
  });

  it('clears the prompt on cancelResult for interaction kinds without a submittedPrompt', () => {
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent: vi.fn() }),
    );

    act(() => {
      result.current.setPrompt('leftover text');
      result.current.cancelResult();
    });

    expect(result.current.prompt).toBe('');
    expect(result.current.interaction).toEqual({ kind: 'idle' });
  });

  it('reports isSaving true while a task or event mutation is pending', () => {
    mockCreateTaskPending = true;
    const { result } = renderHookWithQueryClient(() =>
      useTimeComposer({ onError: vi.fn(), onOpenEvent: vi.fn() }),
    );

    expect(result.current.isSaving).toBe(true);
  });
});
