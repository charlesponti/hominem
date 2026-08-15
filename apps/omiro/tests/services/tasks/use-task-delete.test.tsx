import type { TaskDetailOutput, TaskListItem } from '@hominem/rpc/types';
// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { taskKeys } from '~/services/tasks/query-keys';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockDelete = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => ({
    api: {
      tasks: {
        ':id': {
          $delete: mockDelete,
        },
      },
    },
  }),
}));

const { useTaskDelete } = await import('~/services/tasks/use-task-delete');

function taskListItem(id: string): TaskListItem {
  return { id, title: `Task ${id}`, childCount: 0 } as unknown as TaskListItem;
}

describe('useTaskDelete', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('removes the task from the list cache and its own detail cache on success', async () => {
    mockDelete.mockResolvedValueOnce({ json: async () => ({ id: '1' }) });
    const { result, queryClient } = renderHookWithQueryClient(() => useTaskDelete());
    queryClient.setQueryData(taskKeys.all, [taskListItem('1'), taskListItem('2')]);
    queryClient.setQueryData(taskKeys.detail('1'), {
      task: taskListItem('1'),
      participants: [],
      children: [],
    });

    await act(async () => {
      await result.current.mutateAsync('1');
    });

    expect(queryClient.getQueryData<TaskListItem[]>(taskKeys.all)).toEqual([taskListItem('2')]);
    expect(queryClient.getQueryData(taskKeys.detail('1'))).toBeUndefined();
  });

  it('removes the task from the parent detail children when a parentId is given', async () => {
    mockDelete.mockResolvedValueOnce({ json: async () => ({ id: 'child-1' }) });
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useTaskDelete({ parentId: 'parent-1' }),
    );
    queryClient.setQueryData<TaskDetailOutput>(taskKeys.detail('parent-1'), {
      task: taskListItem('parent-1'),
      participants: [],
      children: [taskListItem('child-1'), taskListItem('child-2')],
    } as unknown as TaskDetailOutput);

    await act(async () => {
      await result.current.mutateAsync('child-1');
    });

    const detail = queryClient.getQueryData<TaskDetailOutput>(taskKeys.detail('parent-1'));
    expect(detail?.children).toEqual([taskListItem('child-2')]);
  });

  it('does not touch a parent detail cache when no parentId is given', async () => {
    mockDelete.mockResolvedValueOnce({ json: async () => ({ id: '1' }) });
    const { result, queryClient } = renderHookWithQueryClient(() => useTaskDelete());
    queryClient.setQueryData(taskKeys.all, [taskListItem('1')]);

    await act(async () => {
      await result.current.mutateAsync('1');
    });

    expect(mockDelete).toHaveBeenCalledWith({ param: { id: '1' } });
  });
});
