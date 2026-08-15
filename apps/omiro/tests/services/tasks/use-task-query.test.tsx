import type { TaskDetailOutput } from '@hominem/rpc/types';
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
        ':id': {
          $get: mockGet,
        },
      },
    },
  }),
}));

const { useTaskQuery } = await import('~/services/tasks/use-task-query');

function taskDetail(id: string): TaskDetailOutput {
  return {
    task: { id, title: 'Buy milk' },
    participants: [],
    children: [],
  } as unknown as TaskDetailOutput;
}

describe('useTaskQuery', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns the task detail', async () => {
    mockGet.mockResolvedValueOnce({ json: async () => taskDetail('task-1') });
    const { result } = renderHookWithQueryClient(() => useTaskQuery({ taskId: 'task-1' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith({ param: { id: 'task-1' } });
    expect(result.current.data).toEqual(taskDetail('task-1'));
  });

  it('surfaces a query error', async () => {
    mockGet.mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHookWithQueryClient(() => useTaskQuery({ taskId: 'task-1' }));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('network error'));
  });

  it('does not fetch when disabled', async () => {
    const { result } = renderHookWithQueryClient(() =>
      useTaskQuery({ taskId: 'task-1', enabled: false }),
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('does not fetch when the task id is empty', async () => {
    const { result } = renderHookWithQueryClient(() => useTaskQuery({ taskId: '' }));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });
});
