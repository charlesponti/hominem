import type { TaskDetailOutput, TaskListItem } from '@hominem/rpc/types';
// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { taskKeys } from '~/services/tasks/query-keys';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockPost = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => ({
    api: {
      tasks: {
        voice: {
          $post: mockPost,
        },
      },
    },
  }),
}));

const { useVoiceTasks } = await import('~/services/tasks/use-voice-tasks');

function task(id: string, overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id,
    ownerUserId: 'owner-1',
    title: `Task ${id}`,
    description: null,
    parentTaskId: null,
    status: 'pending',
    priority: 'medium',
    dueAt: null,
    durationMinutes: null,
    schedulingWindowStartAt: null,
    schedulingWindowEndAt: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    timeZone: null,
    location: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    artifactType: 'task',
    ...overrides,
  };
}

describe('useVoiceTasks', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws the server-provided error message when the response is not ok', async () => {
    mockPost.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Could not create tasks' }),
    });
    const { result } = renderHookWithQueryClient(() => useVoiceTasks());

    await act(async () => {
      await expect(
        result.current.mutateAsync({ transcript: 'x', referenceDate: 'x', timezone: 'x' }),
      ).rejects.toThrow('Could not create tasks');
    });
  });

  it('falls back to a status-coded error when there is no response body', async () => {
    mockPost.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });
    const { result } = renderHookWithQueryClient(() => useVoiceTasks());

    await act(async () => {
      await expect(
        result.current.mutateAsync({ transcript: 'x', referenceDate: 'x', timezone: 'x' }),
      ).rejects.toThrow('Voice task creation failed (500)');
    });
  });

  it('does nothing to the cache when no tasks were created', async () => {
    mockPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ parent: null, tasks: [] }),
    });
    const { result, queryClient } = renderHookWithQueryClient(() => useVoiceTasks());

    await act(async () => {
      await result.current.mutateAsync({ transcript: 'x', referenceDate: 'x', timezone: 'x' });
    });

    expect(queryClient.getQueryData(taskKeys.all)).toBeUndefined();
  });

  it('prepends a single created task and seeds its detail cache', async () => {
    const createdTask = task('1');
    mockPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ parent: null, tasks: [createdTask] }),
    });
    const { result, queryClient } = renderHookWithQueryClient(() => useVoiceTasks());
    queryClient.setQueryData(taskKeys.all, [{ id: 'existing', childCount: 0 }]);

    await act(async () => {
      await result.current.mutateAsync({ transcript: 'x', referenceDate: 'x', timezone: 'x' });
    });

    const list = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
    expect(list?.[0]).toEqual(expect.objectContaining({ id: '1', childCount: 0 }));
    expect(list?.[1]).toEqual(expect.objectContaining({ id: 'existing' }));
    expect(queryClient.getQueryData(taskKeys.detail('1'))).toEqual({
      task: createdTask,
      participants: [],
      children: [],
    });
  });

  it('groups multiple tasks under a parent, seeding parent and child detail caches', async () => {
    const parentTask = task('parent-1');
    const children = [task('child-1'), task('child-2')];
    mockPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ parent: parentTask, tasks: children }),
    });
    const { result, queryClient } = renderHookWithQueryClient(() => useVoiceTasks());

    await act(async () => {
      await result.current.mutateAsync({ transcript: 'x', referenceDate: 'x', timezone: 'x' });
    });

    const list = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
    expect(list?.[0]).toEqual(expect.objectContaining({ id: 'parent-1', childCount: 2 }));

    const parentDetail = queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail('parent-1'));
    expect(parentDetail).toEqual({ task: parentTask, participants: [], children });

    expect(queryClient.getQueryData(taskKeys.detail('child-1'))).toEqual({
      task: children[0],
      participants: [],
      children: [],
    });
    expect(queryClient.getQueryData(taskKeys.detail('child-2'))).toEqual({
      task: children[1],
      participants: [],
      children: [],
    });
  });
});
