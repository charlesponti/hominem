import type { TaskListItem } from '@hominem/rpc/types';
// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockGet = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => ({
    api: {
      tasks: {
        $get: mockGet,
      },
    },
  }),
}));

const { useTasksQuery } = await import('~/services/tasks/use-tasks-query');

function taskListItem(id: string): TaskListItem {
  return { id, title: `Task ${id}`, childCount: 0 } as unknown as TaskListItem;
}

describe('useTasksQuery', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and unwraps the tasks list', async () => {
    mockGet.mockResolvedValueOnce({
      json: async () => ({ tasks: [taskListItem('1'), taskListItem('2')] }),
    });
    const { result } = renderHookWithQueryClient(() => useTasksQuery());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([taskListItem('1'), taskListItem('2')]);
  });

  it('surfaces a query error', async () => {
    mockGet.mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHookWithQueryClient(() => useTasksQuery());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('network error'));
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHookWithQueryClient(() => useTasksQuery({ enabled: false }));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });
});
