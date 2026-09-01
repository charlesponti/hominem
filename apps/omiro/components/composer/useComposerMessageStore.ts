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
// only re-renders when the selector's output actually changes (a boolean, an
// inferred 'chat' | 'note' kind, etc.) rather than on every keystroke. Needs
// the selector to return a primitive -- React compares with Object.is, so a
// selector returning a new object/array each call would re-render every time
// anyway.
export function useComposerMessageStore<T>(
  store: ComposerMessageStore,
  selector: (message: string) => T,
): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.getMessage()));
}
