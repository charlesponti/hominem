// @vitest-environment jsdom
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useComposerDraft } from '~/components/composer/useComposerDraft';

import { renderHookWithQueryClient } from '../../utils/render-hook';

describe('useComposerDraft', () => {
  it('defaults the store to an empty message when no initialMessage is given', () => {
    const { result } = renderHookWithQueryClient(() => useComposerDraft());
    expect(result.current.getMessage()).toBe('');
  });

  it('seeds the store from initialMessage', () => {
    const { result } = renderHookWithQueryClient(() =>
      useComposerDraft({ initialMessage: 'hello' }),
    );
    expect(result.current.getMessage()).toBe('hello');
  });

  it('updates the store and notifies onDraftChange when setMessage is called', () => {
    const onDraftChange = vi.fn();
    const { result } = renderHookWithQueryClient(() => useComposerDraft({ onDraftChange }));

    act(() => result.current.setMessage('typed'));

    expect(result.current.getMessage()).toBe('typed');
    expect(onDraftChange).toHaveBeenCalledWith('typed');
  });

  it('clearDraft resets the message to empty and still notifies onDraftChange', () => {
    const onDraftChange = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useComposerDraft({ initialMessage: 'hello', onDraftChange }),
    );

    act(() => result.current.clearDraft());

    expect(result.current.getMessage()).toBe('');
    expect(onDraftChange).toHaveBeenCalledWith('');
  });

  it('keeps the same store instance across re-renders', () => {
    const { result, rerender } = renderHookWithQueryClient(
      (props: { initialMessage?: string }) => useComposerDraft(props),
      { initialProps: { initialMessage: 'hello' } },
    );
    const initialStore = result.current.store;

    rerender({ initialMessage: 'hello' });

    expect(result.current.store).toBe(initialStore);
  });
});
