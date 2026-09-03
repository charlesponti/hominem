export type Listener<T> = (snapshot: T) => void;

export function createStore<T>(initialValue: T) {
  let snapshot = initialValue;
  const listeners = new Set<Listener<T>>();

  const emit = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  return {
    getSnapshot: () => snapshot,
    setSnapshot: (next: T) => {
      snapshot = next;
      emit();
    },
    updateSnapshot: (updater: (current: T) => T) => {
      snapshot = updater(snapshot);
      emit();
    },
    subscribe: (listener: Listener<T>) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
  };
}
