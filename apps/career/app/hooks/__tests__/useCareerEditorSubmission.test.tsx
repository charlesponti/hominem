import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCareerEditorSubmission } from '../useCareerEditorSubmission';

describe('useCareerEditorSubmission', () => {
  it('clears the inline error after a successful save', () => {
    const onSuccess = vi.fn();

    const { rerender, result } = renderHook(
      ({ fetcher }: { fetcher: { state: string; data: unknown } }) =>
        useCareerEditorSubmission({
          fetcher,
          errorMessage: 'Failed to save',
          onSuccess,
        }),
      {
        initialProps: {
          fetcher: { state: 'submitting', data: undefined as unknown },
        },
      },
    );

    rerender({
      fetcher: {
        state: 'idle',
        data: { success: true, message: 'Project updated successfully' },
      },
    });

    expect(result.current.submissionError).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith({
      success: true,
      message: 'Project updated successfully',
    });
  });

  it('stores an inline error for a failed save', () => {
    const { result } = renderHook(() =>
      useCareerEditorSubmission({
        fetcher: {
          state: 'idle',
          data: { success: false, error: 'Validation failed' },
        },
        errorMessage: 'Failed to save',
      }),
    );

    expect(result.current.submissionError).toBe('Validation failed');
  });

  it('calls the success callback with returned data for new records', () => {
    const onSuccess = vi.fn();

    renderHook(() =>
      useCareerEditorSubmission({
        fetcher: {
          state: 'idle',
          data: { success: true, data: { id: 'project-1' } },
        },
        errorMessage: 'Failed to save',
        onSuccess,
      }),
    );

    expect(onSuccess).toHaveBeenCalledWith({ success: true, data: { id: 'project-1' } });
  });
});
