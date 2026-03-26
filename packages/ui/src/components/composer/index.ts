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
  // Re-exports from store
  ComposerStore,
  INITIAL_COMPOSER_STATE,
  useComposerActionsRef,
  useComposerSlice,
  useComposerStore,
} from './composer-provider';
export type {
  // Re-exported store types
  ComposerAction,
  ComposerActions,
  ComposerMode,
  ComposerProviderProps,
  ComposerState,
} from './composer-provider';

// ─── Actions (pure functions) ─────────────────────────────────────────────────
export {
  appendTranscriptToDraft,
  buildNoteContext,
  resolveComposerActions,
  toNoteTitle,
} from './composer-actions';
export type { ResolveComposerActionsInput, ResolvedComposerActions } from './composer-actions';

// ─── Presentation ─────────────────────────────────────────────────────────────
export { deriveComposerPresentation } from './composer-presentation';
export type { ComposerPosture, ComposerPresentation } from './composer-presentation';

// ─── Attachment utilities ─────────────────────────────────────────────────────
export {
  appendChatAttachmentContext,
  appendNoteAttachments,
  formatNoteAttachmentsSection,
  formatUploadedFileContext,
  getAttachmentType,
} from './composer-attachments';

// ─── Mobile (unchanged) ───────────────────────────────────────────────────────
export { MOBILE_EXPANDED_HEIGHT_VH, PILL_HEIGHT, playSwipeSnap } from './animations';
export { useSwipeGesture } from './mobile-gestures';
