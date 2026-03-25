// ─── Components ───────────────────────────────────────────────────────────────
export { AttachedNotesList } from './attached-notes-list';
export { Composer } from './composer';
export type { ComposerProps } from './composer';
export { ComposerActionsRow } from './composer-actions-row';
export { ComposerAttachmentList } from './composer-attachment-list';
export { ComposerShell } from './composer-shell';
export { ComposerTools } from './composer-tools';
export { NotePickerDialog } from './note-picker-dialog';
export { VoiceDialog } from './voice-dialog';

// ─── Provider & Store ─────────────────────────────────────────────────────────
export {
  ComposerProvider,
  useComposerActionsRef,
  useComposerSlice,
  useComposerStore,
  // Re-exports from store
  ComposerStore,
  INITIAL_COMPOSER_STATE,
} from './composer-provider';
export type {
  ComposerActions,
  ComposerMode,
  ComposerProviderProps,
  // Re-exported store types
  ComposerAction,
  ComposerState,
} from './composer-provider';

// ─── Actions (pure functions) ─────────────────────────────────────────────────
export { buildNoteContext, resolveComposerActions, toNoteTitle } from './composer-actions';
export type { ResolvedComposerActions, ResolveComposerActionsInput } from './composer-actions';

// ─── Presentation ─────────────────────────────────────────────────────────────
export { deriveComposerPresentation } from './composer-presentation';
export type { ComposerPosture, ComposerPresentation } from './composer-presentation';

// ─── Attachment utilities ─────────────────────────────────────────────────────
export {
  appendChatAttachmentContext,
  appendNoteAttachments,
  formatNoteAttachmentsSection,
  formatUploadedFileContext,
} from './composer-attachments';

// ─── Mobile (unchanged) ───────────────────────────────────────────────────────
export { playSwipeSnap, PILL_HEIGHT, MOBILE_EXPANDED_HEIGHT_VH } from './animations';
export { useSwipeGesture } from './mobile-gestures';
