import { useSyncExternalStore } from 'react';

export interface ComposerMessageStore {
  getMessage: () => string;
  setMessage: (next: string) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createComposerMessageStore(initialMessage = ''): ComposerMessageStore {
  let message = initialMessage;
  const listeners = new Set<() => void>();

  return {
    getMessage: () => message,
    setMessage: (next) => {
      if (next === message) {
        return;
      }
      message = next;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// Subscribes to a *derived* value instead of the raw message, so the caller
// only re-renders when the selector's output changes (e.g. a boolean or an
// inferred 'chat' | 'note' kind) rather than on every keystroke. This relies
// on the selector returning a primitive -- React compares snapshots with
// Object.is, so a selector that returns a new object/array each call would
// re-render every time regardless.
export function useComposerMessageStore<T>(
  store: ComposerMessageStore,
  selector: (message: string) => T,
): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.getMessage()));
}
