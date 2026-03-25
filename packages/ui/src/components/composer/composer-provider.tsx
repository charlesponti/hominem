/**
 * ComposerProvider
 *
 * Provides two stable contexts:
 *   1. ComposerStoreCtx  — the external state store (created once in the layout)
 *   2. ComposerActionsCtx — a ref to platform-specific async action functions
 *
 * Zero useState. Zero useEffect. Zero re-renders from this component.
 * All state lives in ComposerStore (see composer-store.ts).
 * All async operations flow through actionsRef.current.
 */

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type Context,
  type ReactNode,
} from 'react';

import type { UploadedFile } from '../../types/upload';
import { INITIAL_COMPOSER_STATE, ComposerStore, type ComposerState } from './composer-store';

// ─── ComposerActions ──────────────────────────────────────────────────────────
//
// Platform-provided async functions injected at the layout level via a stable
// ref. The form action always calls actionsRef.current.X — never stale.

export interface ComposerActions {
  createNote: (input: { content: string; title?: string }) => Promise<unknown>;
  updateNote: (input: { id: string; content: string }) => Promise<unknown>;
  sendMessage: (input: { chatId: string; message: string }) => Promise<unknown>;
  createChat: (input: { seedText: string; title: string }) => Promise<{ id: string }>;
  uploadFiles: (files: FileList | File[]) => Promise<ReadonlyArray<UploadedFile>>;
  navigate: (path: string) => void;
}

// ─── Contexts ─────────────────────────────────────────────────────────────────

const ComposerStoreCtx = createContext<ComposerStore | null>(null);
const ComposerActionsCtx = createContext<React.MutableRefObject<ComposerActions> | null>(null);

function useRequired<T>(ctx: Context<T | null>, name: string): T {
  const value = useContext(ctx);
  if (!value) throw new Error(`${name} must be used within ComposerProvider`);
  return value;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export interface ComposerProviderProps {
  /** Created once in the layout: useMemo(() => new ComposerStore(), []) */
  store: ComposerStore;
  /** Stable ref whose .current is updated each render in the layout */
  actionsRef: React.MutableRefObject<ComposerActions>;
  children: ReactNode;
}

/** Zero hooks. Zero state. Zero effects. Just context wiring. */
export function ComposerProvider({ store, actionsRef, children }: ComposerProviderProps) {
  return (
    <ComposerStoreCtx.Provider value={store}>
      <ComposerActionsCtx.Provider value={actionsRef}>{children}</ComposerActionsCtx.Provider>
    </ComposerStoreCtx.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useComposerStore(): ComposerStore {
  return useRequired(ComposerStoreCtx, 'useComposerStore');
}

export function useComposerActionsRef(): React.MutableRefObject<ComposerActions> {
  return useRequired(ComposerActionsCtx, 'useComposerActionsRef');
}

/**
 * Subscribe to a fine-grained slice of composer state.
 * The calling component re-renders ONLY when the selected value changes.
 *
 * @example
 *   const draft = useComposerSlice(s => s.draft)
 *   const canSubmit = useComposerSlice(s => s.draft.trim().length > 0 || s.uploadedFiles.length > 0)
 */
export function useComposerSlice<T>(selector: (state: ComposerState) => T): T {
  const store = useComposerStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(INITIAL_COMPOSER_STATE),
  );
}

// Re-export store types consumed by callers
export type { ComposerState, ComposerAction } from './composer-store';
export { ComposerStore, INITIAL_COMPOSER_STATE } from './composer-store';

// Re-export ComposerMode (used by layout and useComposerMode)
export type ComposerMode = 'generic' | 'note-aware' | 'chat-continuation';
