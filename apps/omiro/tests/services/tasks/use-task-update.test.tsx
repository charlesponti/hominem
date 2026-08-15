import type { TaskDetailOutput, TaskListItem } from '@hominem/rpc/types';
// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { taskKeys } from '~/services/tasks/query-keys';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockPatch = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => ({
    api: {
      tasks: {
        ':id': {
          $patch: mockPatch,
        },
      },
    },
  }),
}));

const { useTaskUpdate } = await import('~/services/tasks/use-task-update');

function taskListItem(id: string, overrides: Partial<TaskListItem> = {}): TaskListItem {
  return {
    id,
    title: `Task ${id}`,
    priority: 'medium',
    childCount: 0,
    ...overrides,
  } as unknown as TaskListItem;
}

describe('useTaskUpdate', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('optimistically patches only the provided fields in the list cache', async () => {
    mockPatch.mockImplementation(() => new Promise(() => {}));
    const { result, queryClient } = renderHookWithQueryClient(() => useTaskUpdate());
    queryClient.setQueryData(taskKeys.all, [taskListItem('1', { title: 'Old title' })]);

    act(() => {
      result.current.mutate({ taskId: '1', priority: 'high' });
    });

    await waitFor(() => {
      const list = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
      expect(list?.[0]?.priority).toBe('high');
    });
    const list = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
    expect(list?.[0]?.title).toBe('Old title');
  });

  it('optimistically patches the standalone task detail cache when there is no parent', async () => {
    mockPatch.mockImplementation(() => new Promise(() => {}));
    const { result, queryClient } = renderHookWithQueryClient(() => useTaskUpdate());
    queryClient.setQueryData<TaskDetailOutput>(taskKeys.detail('1'), {
      task: taskListItem('1', { title: 'Old title' }),
      participants: [],
      children: [],
    } as unknown as TaskDetailOutput);

    act(() => {
      result.current.mutate({ taskId: '1', title: 'New title' });
    });

    await waitFor(() => {
      const detail = queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail('1'));
      expect((detail?.task as TaskListItem | undefined)?.title).toBe('New title');
    });
  });

  it('optimistically patches the parent detail children when a parentId is given', async () => {
    mockPatch.mockImplementation(() => new Promise(() => {}));
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useTaskUpdate({ parentId: 'parent-1' }),
    );
    queryClient.setQueryData<TaskDetailOutput>(taskKeys.detail('parent-1'), {
      task: taskListItem('parent-1'),
      participants: [],
      children: [taskListItem('child-1', { title: 'Old title' })],
    } as unknown as TaskDetailOutput);

    act(() => {
      result.current.mutate({ taskId: 'child-1', title: 'New title' });
    });

    await waitFor(() => {
      const detail = queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail('parent-1'));
      expect((detail?.children[0] as TaskListItem | undefined)?.title).toBe('New title');
    });
  });

  it('rolls back the list, detail, and parent detail caches when the request fails', async () => {
    mockPatch.mockRejectedValueOnce(new Error('network error'));
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useTaskUpdate({ parentId: 'parent-1' }),
    );
    const originalList = [taskListItem('child-1', { title: 'Old title' })];
    const originalDetail = {
      task: taskListItem('child-1', { title: 'Old title' }),
      participants: [],
      children: [],
    } as unknown as TaskDetailOutput;
    const originalParentDetail = {
      task: taskListItem('parent-1'),
      participants: [],
      children: [taskListItem('child-1', { title: 'Old title' })],
    } as unknown as TaskDetailOutput;
    queryClient.setQueryData(taskKeys.all, originalList);
    queryClient.setQueryData(taskKeys.detail('child-1'), originalDetail);
    queryClient.setQueryData(taskKeys.detail('parent-1'), originalParentDetail);

    await act(async () => {
      await result.current
        .mutateAsync({ taskId: 'child-1', title: 'New title' })
        .catch(() => undefined);
    });

    expect(queryClient.getQueryData(taskKeys.all)).toEqual(originalList);
    expect(queryClient.getQueryData(taskKeys.detail('child-1'))).toEqual(originalDetail);
    expect(queryClient.getQueryData(taskKeys.detail('parent-1'))).toEqual(originalParentDetail);
  });

  it('reconciles the list cache with the server response on success', async () => {
    mockPatch.mockResolvedValueOnce({
      json: async () => taskListItem('1', { title: 'Server title' }),
    });
    const { result, queryClient } = renderHookWithQueryClient(() => useTaskUpdate());
    queryClient.setQueryData(taskKeys.all, [taskListItem('1', { title: 'Old title' })]);

    await act(async () => {
      await result.current.mutateAsync({ taskId: '1', title: 'New title' });
    });

    const list = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
    expect(list?.[0]?.title).toBe('Server title');
  });
});
