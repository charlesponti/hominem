// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useNewMessageIds } from './use-new-message-ids';

describe('useNewMessageIds', () => {
  it('treats messages present at mount as historical, not new', () => {
    const { result } = renderHook(({ ids }) => useNewMessageIds(ids), {
      initialProps: { ids: ['m1', 'm2'] },
    });

    expect(result.current.size).toBe(0);
  });

  it('flags a message id appended after mount as new', async () => {
    const { result, rerender } = renderHook(({ ids }) => useNewMessageIds(ids), {
      initialProps: { ids: ['m1', 'm2'] },
    });
    expect(result.current.size).toBe(0);

    await act(async () => {
      rerender({ ids: ['m1', 'm2', 'm3'] });
    });

    expect(result.current.has('m3')).toBe(true);
    expect(result.current.has('m1')).toBe(false);
  });

  it('does not keep re-flagging the same id as new on later renders', async () => {
    const { result, rerender } = renderHook(({ ids }) => useNewMessageIds(ids), {
      initialProps: { ids: ['m1'] },
    });

    await act(async () => {
      rerender({ ids: ['m1', 'm2'] });
    });
    expect(result.current.has('m2')).toBe(true);

    await act(async () => {
      rerender({ ids: ['m1', 'm2'] });
    });
    expect(result.current.has('m2')).toBe(false);
  });
});
