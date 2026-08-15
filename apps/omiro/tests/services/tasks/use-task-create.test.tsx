import type { TaskDetailOutput, TaskListItem } from '@hominem/rpc/types';
// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
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
        $post: mockPost,
      },
    },
  }),
}));

const { useTaskCreate } = await import('~/services/tasks/use-task-create');

function serverTask(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    ownerUserId: 'owner-1',
    title: 'Buy milk',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    artifactType: 'task',
    ...overrides,
  };
}

describe('useTaskCreate', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('optimistically prepends the new task to the list cache', async () => {
    mockPost.mockImplementation(() => new Promise(() => {}));
    const { result, queryClient } = renderHookWithQueryClient(() => useTaskCreate());
    queryClient.setQueryData(taskKeys.all, [{ id: 'existing', title: 'Existing', childCount: 0 }]);

    act(() => {
      result.current.mutate({ title: 'Buy milk' });
    });

    await waitFor(() => {
      const list = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
      expect(list).toHaveLength(2);
    });
    const list = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
    expect(list?.[0]).toEqual(
      expect.objectContaining({ title: 'Buy milk', status: 'pending', childCount: 0 }),
    );
    expect(list?.[1]).toEqual(expect.objectContaining({ id: 'existing' }));
  });

  it('reconciles the optimistic task with the server response on success', async () => {
    const created = serverTask('server-1');
    mockPost.mockResolvedValueOnce({ json: async () => created });
    const { result, queryClient } = renderHookWithQueryClient(() => useTaskCreate());

    await act(async () => {
      await result.current.mutateAsync({ title: 'Buy milk' });
    });

    const list = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
    expect(list).toEqual([expect.objectContaining({ id: 'server-1', childCount: 0 })]);
    expect(list?.some((task) => task.id.startsWith('optimistic-task-'))).toBe(false);

    const detail = queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail('server-1'));
    expect(detail).toEqual({
      task: created,
      participants: [],
      children: [],
    });
  });

  it('rolls back the list cache when the request fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('network error'));
    const { result, queryClient } = renderHookWithQueryClient(() => useTaskCreate());
    const originalList = [{ id: 'existing', title: 'Existing', childCount: 0 }];
    queryClient.setQueryData(taskKeys.all, originalList);

    await act(async () => {
      await result.current.mutateAsync({ title: 'Buy milk' }).catch(() => undefined);
    });

    expect(queryClient.getQueryData(taskKeys.all)).toEqual(originalList);
  });

  it('optimistically appends to the parent detail children and bumps childCount when parentId is given', async () => {
    mockPost.mockImplementation(() => new Promise(() => {}));
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useTaskCreate({ parentId: 'parent-1' }),
    );
    queryClient.setQueryData(taskKeys.all, [{ id: 'parent-1', title: 'Parent', childCount: 0 }]);
    queryClient.setQueryData<TaskDetailOutput>(taskKeys.detail('parent-1'), {
      task: serverTask('parent-1'),
      participants: [],
      children: [],
    } as unknown as TaskDetailOutput);

    act(() => {
      result.current.mutate({ title: 'Sub task' });
    });

    await waitFor(() => {
      const detail = queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail('parent-1'));
      expect(detail?.children).toHaveLength(1);
    });
    const list = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
    expect(list?.[0]).toEqual(expect.objectContaining({ id: 'parent-1', childCount: 1 }));
  });

  it('reconciles the optimistic child with the server response when parentId is given', async () => {
    const createdChild = serverTask('child-1', { title: 'Sub task' });
    mockPost.mockResolvedValueOnce({ json: async () => createdChild });
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useTaskCreate({ parentId: 'parent-1' }),
    );
    queryClient.setQueryData<TaskDetailOutput>(taskKeys.detail('parent-1'), {
      task: serverTask('parent-1'),
      participants: [],
      children: [],
    } as unknown as TaskDetailOutput);

    await act(async () => {
      await result.current.mutateAsync({ title: 'Sub task' });
    });

    const detail = queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail('parent-1'));
    expect(detail?.children).toEqual([createdChild]);
  });

  it('sends parentTaskId from the hook option, preferring it over an input value', async () => {
    mockPost.mockResolvedValueOnce({ json: async () => serverTask('child-1') });
    const { result } = renderHookWithQueryClient(() => useTaskCreate({ parentId: 'parent-1' }));

    await act(async () => {
      await result.current.mutateAsync({ title: 'Sub task', parentTaskId: 'ignored-parent' });
    });

    const [{ json }] = mockPost.mock.calls[0];
    expect(json.parentTaskId).toBe('parent-1');
  });
});
