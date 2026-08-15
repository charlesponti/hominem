// @vitest-environment jsdom
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import {
  createComposerMessageStore,
  useComposerMessageSelector,
  useComposerMessageValue,
} from '~/components/composer/useComposerMessageStore';

import { renderHookWithQueryClient } from '../../utils/render-hook';

describe('createComposerMessageStore', () => {
  it('does not notify listeners when the message is set to its current value', () => {
    const store = createComposerMessageStore('same');
    let notifications = 0;
    store.subscribe(() => {
      notifications++;
    });

    store.setMessage('same');

    expect(notifications).toBe(0);
    expect(store.getMessage()).toBe('same');
  });

  it('notifies listeners when the message changes', () => {
    const store = createComposerMessageStore('');
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications++;
    });

    store.setMessage('new value');
    expect(notifications).toBe(1);
    expect(store.getMessage()).toBe('new value');

    unsubscribe();
    store.setMessage('another value');
    expect(notifications).toBe(1);
  });
});

describe('useComposerMessageValue', () => {
  it('re-renders with the latest message on every change', () => {
    const store = createComposerMessageStore('initial');
    const { result } = renderHookWithQueryClient(() => useComposerMessageValue(store));

    expect(result.current).toBe('initial');

    act(() => store.setMessage('updated'));
    expect(result.current).toBe('updated');
  });
});

describe('useComposerMessageSelector', () => {
  it('derives a value from the message via the selector', () => {
    const store = createComposerMessageStore('hello');
    const { result } = renderHookWithQueryClient(() =>
      useComposerMessageSelector(store, (message) => message.length > 0),
    );

    expect(result.current).toBe(true);

    act(() => store.setMessage(''));
    expect(result.current).toBe(false);
  });

  it('reflects the latest selector output after repeated updates', () => {
    const store = createComposerMessageStore('');
    const { result } = renderHookWithQueryClient(() =>
      useComposerMessageSelector(
        store,
        (message) => message.trim().split(/\s+/).filter(Boolean).length,
      ),
    );

    expect(result.current).toBe(0);

    act(() => store.setMessage('one two three'));
    expect(result.current).toBe(3);
  });
});
