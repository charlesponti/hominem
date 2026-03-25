/**
 * ComposerStore
 *
 * All composer state lives outside React in a plain observable class.
 * Components subscribe via useSyncExternalStore with fine-grained selectors —
 * only the subscribing component re-renders when its slice changes.
 *
 * The reducer is a pure function — testable with zero React.
 */

import type { Note } from '@hominem/rpc/types/notes.types';

import type { UploadedFile } from '../../types/upload';

// ─── State ────────────────────────────────────────────────────────────────────

export interface ComposerState {
  readonly draft: string;
  readonly attachedNotes: ReadonlyArray<Note>;
  readonly uploadedFiles: ReadonlyArray<UploadedFile>;
  readonly isUploading: boolean;
  readonly uploadProgress: number;
  readonly uploadErrors: ReadonlyArray<string>;
}

export const INITIAL_COMPOSER_STATE: ComposerState = {
  draft: '',
  attachedNotes: [],
  uploadedFiles: [],
  isUploading: false,
  uploadProgress: 0,
  uploadErrors: [],
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export type ComposerAction =
  | { type: 'SET_DRAFT'; text: string }
  | { type: 'CLEAR_DRAFT' }
  | { type: 'ATTACH_NOTE'; note: Note }
  | { type: 'DETACH_NOTE'; noteId: string }
  | { type: 'CLEAR_NOTES' }
  | { type: 'ADD_FILES'; files: ReadonlyArray<UploadedFile> }
  | { type: 'REMOVE_FILE'; fileId: string }
  | { type: 'CLEAR_FILES' }
  | { type: 'SET_UPLOADING'; isUploading: boolean; progress?: number }
  | { type: 'SET_UPLOAD_ERRORS'; errors: ReadonlyArray<string> }
  | { type: 'CLEAR' }; // draft + notes + files post-submit

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function reduceComposerState(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case 'SET_DRAFT':
      return state.draft === action.text ? state : { ...state, draft: action.text };
    case 'CLEAR_DRAFT':
      return state.draft === '' ? state : { ...state, draft: '' };
    case 'ATTACH_NOTE':
      return state.attachedNotes.some((n) => n.id === action.note.id)
        ? state
        : { ...state, attachedNotes: [...state.attachedNotes, action.note] };
    case 'DETACH_NOTE':
      return {
        ...state,
        attachedNotes: state.attachedNotes.filter((n) => n.id !== action.noteId),
      };
    case 'CLEAR_NOTES':
      return state.attachedNotes.length === 0 ? state : { ...state, attachedNotes: [] };
    case 'ADD_FILES':
      return { ...state, uploadedFiles: [...state.uploadedFiles, ...action.files] };
    case 'REMOVE_FILE':
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.filter((f) => f.id !== action.fileId),
      };
    case 'CLEAR_FILES':
      return state.uploadedFiles.length === 0 ? state : { ...state, uploadedFiles: [] };
    case 'SET_UPLOADING':
      return {
        ...state,
        isUploading: action.isUploading,
        uploadProgress: action.progress ?? state.uploadProgress,
        uploadErrors: action.isUploading ? [] : state.uploadErrors,
      };
    case 'SET_UPLOAD_ERRORS':
      return { ...state, uploadErrors: action.errors, isUploading: false };
    case 'CLEAR':
      return {
        ...INITIAL_COMPOSER_STATE,
        // Preserve upload state — an in-flight upload should not be cancelled by submit
        isUploading: state.isUploading,
        uploadProgress: state.uploadProgress,
      };
    default:
      return state;
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export class ComposerStore {
  #state: ComposerState = INITIAL_COMPOSER_STATE;
  readonly #listeners = new Set<() => void>();

  dispatch = (action: ComposerAction): void => {
    const next = reduceComposerState(this.#state, action);
    if (next === this.#state) return; // structural equality — skip notify
    this.#state = next;
    for (const listener of this.#listeners) listener();
  };

  // useSyncExternalStore interface
  getSnapshot = (): ComposerState => this.#state;
  getServerSnapshot = (): ComposerState => INITIAL_COMPOSER_STATE;
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
}
