// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useNoteFormatting } from '~/hooks/use-note-formatting';

function selectionEvent(start: number, end: number) {
  return { nativeEvent: { selection: { start, end } } } as unknown as Parameters<
    ReturnType<typeof useNoteFormatting>['onSelectionChange']
  >[0];
}

describe('useNoteFormatting', () => {
  it('applies bold formatting at the default {0,0} selection before any selection event fires', () => {
    const { result } = renderHook(() => useNoteFormatting());

    let next = '';
    act(() => {
      next = result.current.applyFormat('hello world', 'bold');
    });

    expect(next).toBe('****hello world');
  });

  it('tracks the selection reported by onSelectionChange and formats at that position', () => {
    const { result } = renderHook(() => useNoteFormatting());

    act(() => {
      result.current.onSelectionChange(selectionEvent(5, 5));
    });

    let next = '';
    act(() => {
      next = result.current.applyFormat('hello world', 'bold');
    });

    expect(next).toBe('hello**** world');
  });

  it('assumes the cursor is at the end of the content on first focus before any selection is known', () => {
    const { result } = renderHook(() => useNoteFormatting());

    act(() => {
      result.current.onFocus('hello');
    });

    let next = '';
    act(() => {
      next = result.current.applyFormat('hello', 'bold');
    });

    expect(next).toBe('hello****');
  });

  it('does not override a known selection on a later focus event', () => {
    const { result } = renderHook(() => useNoteFormatting());

    act(() => {
      result.current.onSelectionChange(selectionEvent(0, 0));
    });
    act(() => {
      result.current.onFocus('hello');
    });

    let next = '';
    act(() => {
      next = result.current.applyFormat('hello', 'bold');
    });

    expect(next).toBe('****hello');
  });

  it('exposes the format-driven controlled selection and clears it on the next real selection event', () => {
    const { result } = renderHook(() => useNoteFormatting());
    expect(result.current.controlledSelection).toBeUndefined();

    act(() => {
      result.current.applyFormat('hello', 'bold');
    });
    expect(result.current.controlledSelection).toEqual({ start: 2, end: 2 });

    act(() => {
      result.current.onSelectionChange(selectionEvent(3, 3));
    });
    expect(result.current.controlledSelection).toBeUndefined();
  });
});
