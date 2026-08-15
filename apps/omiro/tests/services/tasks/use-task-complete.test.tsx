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
          complete: {
            $patch: mockPatch,
          },
        },
      },
    },
  }),
}));

const { useTaskComplete } = await import('~/services/tasks/use-task-complete');

function taskListItem(id: string, overrides: Partial<TaskListItem> = {}): TaskListItem {
  return {
    id,
    title: `Task ${id}`,
    status: 'pending',
    completedAt: null,
    childCount: 0,
    ...overrides,
  } as unknown as TaskListItem;
}

describe('useTaskComplete', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('optimistically marks the task complete in the list cache', async () => {
    mockPatch.mockImplementation(() => new Promise(() => {}));
    const { result, queryClient } = renderHookWithQueryClient(() => useTaskComplete());
    queryClient.setQueryData(taskKeys.all, [taskListItem('1'), taskListItem('2')]);

    act(() => {
      result.current.mutate({ taskId: '1', completed: true });
    });

    await waitFor(() => {
      const tasks = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
      expect(tasks?.find((t) => t.id === '1')?.status).toBe('completed');
    });
    const tasks = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
    expect(tasks?.find((t) => t.id === '1')?.completedAt).not.toBeNull();
    expect(tasks?.find((t) => t.id === '2')?.status).toBe('pending');
  });

  it('optimistically updates the standalone task detail cache when there is no parent', async () => {
    mockPatch.mockImplementation(() => new Promise(() => {}));
    const { result, queryClient } = renderHookWithQueryClient(() => useTaskComplete());
    queryClient.setQueryData<TaskDetailOutput>(taskKeys.detail('1'), {
      task: taskListItem('1'),
      participants: [],
      children: [],
    } as unknown as TaskDetailOutput);

    act(() => {
      result.current.mutate({ taskId: '1', completed: true });
    });

    await waitFor(() => {
      const detail = queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail('1'));
      expect((detail?.task as TaskListItem | undefined)?.status).toBe('completed');
    });
  });

  it('optimistically updates the parent detail cache children when a parentId is given', async () => {
    mockPatch.mockImplementation(() => new Promise(() => {}));
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useTaskComplete({ parentId: 'parent-1' }),
    );
    queryClient.setQueryData<TaskDetailOutput>(taskKeys.detail('parent-1'), {
      task: taskListItem('parent-1'),
      participants: [],
      children: [taskListItem('child-1')],
    } as unknown as TaskDetailOutput);

    act(() => {
      result.current.mutate({ taskId: 'child-1', completed: true });
    });

    await waitFor(() => {
      const detail = queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail('parent-1'));
      expect((detail?.children[0] as TaskListItem | undefined)?.status).toBe('completed');
    });
  });

  it('reconciles the list cache with the server response on success', async () => {
    mockPatch.mockResolvedValueOnce({
      json: async () => taskListItem('1', { status: 'completed', title: 'Server title' }),
    });
    const { result, queryClient } = renderHookWithQueryClient(() => useTaskComplete());
    queryClient.setQueryData(taskKeys.all, [taskListItem('1')]);

    await act(async () => {
      await result.current.mutateAsync({ taskId: '1', completed: true });
    });

    const tasks = queryClient.getQueryData<TaskListItem[]>(taskKeys.all);
    expect(tasks?.[0]?.title).toBe('Server title');
  });
});
