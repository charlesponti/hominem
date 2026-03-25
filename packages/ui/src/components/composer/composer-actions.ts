/**
 * Composer action utilities — pure functions, zero hooks.
 *
 * resolveComposerActions is kept as a pure function for backward compatibility
 * with existing unit tests. In the new architecture, form submission is handled
 * directly via useActionState in ComposerForm — this module is the shared logic layer.
 */

import { CHAT_TITLE_MAX_LENGTH } from '@hominem/chat-services/constants';
import type { Note } from '@hominem/rpc/types/notes.types';

import type { UploadedFile } from '../../types/upload';
import { appendChatAttachmentContext, appendNoteAttachments } from './composer-attachments';
import type { ComposerPosture } from './composer-presentation';

// ─── Context helpers ──────────────────────────────────────────────────────────

export function buildNoteContext(attachedNotes: ReadonlyArray<Note>): string {
  if (attachedNotes.length === 0) return '';
  const sections = attachedNotes.map(
    (note) => `### ${note.title ?? 'Untitled note'}\n\n${note.content}`,
  );
  return `<context>\n${sections.join('\n\n---\n\n')}\n</context>\n\n`;
}

export function toNoteTitle(text: string, fallback = ''): string {
  return text.slice(0, CHAT_TITLE_MAX_LENGTH) || fallback;
}

// ─── resolveComposerActions (kept for unit tests) ─────────────────────────────

interface ComposerAction {
  execute: () => Promise<void>;
}

export interface ResolvedComposerActions {
  canSubmit: boolean;
  primary: ComposerAction;
  secondary: ComposerAction;
}

export interface ResolveComposerActionsInput {
  posture: ComposerPosture;
  draftText: string;
  noteId: string | null;
  noteTitle: string | null;
  chatId: string | null;
  attachedNotes: ReadonlyArray<Note>;
  uploadedFiles: ReadonlyArray<UploadedFile>;
  isUploadingAttachments: boolean;
  isSubmitting: boolean;
  createNote: (input: { content: string; title?: string }) => Promise<unknown>;
  updateNote: (input: { id: string; content: string }) => Promise<unknown>;
  sendMessage: (input: { chatId: string; message: string }) => Promise<unknown>;
  createChat: (input: { seedText: string; title: string }) => Promise<{ id: string }>;
  clearDraft: () => void;
  clearAttachedNotes: () => void;
  clearUploadedFiles: () => void;
  navigate: (path: string) => void;
  runWithSubmitLock: (task: () => Promise<void>) => Promise<void>;
}

export function resolveComposerActions(
  input: ResolveComposerActionsInput,
): ResolvedComposerActions {
  const text = input.draftText.trim();
  const hasContent = text.length > 0 || input.uploadedFiles.length > 0;
  const canSubmit = hasContent && !input.isSubmitting && !input.isUploadingAttachments;

  return {
    canSubmit,
    primary: {
      execute: async () => {
        if (!hasContent) return;

        await input.runWithSubmitLock(async () => {
          if (input.posture === 'reply' && input.chatId) {
            const prefix = buildNoteContext(input.attachedNotes);
            const message = appendChatAttachmentContext(prefix ? `${prefix}${text}` : text, [
              ...input.uploadedFiles,
            ]);
            await input.sendMessage({ chatId: input.chatId, message });
            input.clearDraft();
            input.clearAttachedNotes();
            input.clearUploadedFiles();
            return;
          }

          if (input.posture === 'draft' && input.noteId) {
            await input.updateNote({
              id: input.noteId,
              content: appendNoteAttachments(text, [...input.uploadedFiles]),
            });
            input.clearDraft();
            input.clearUploadedFiles();
            return;
          }

          const title = toNoteTitle(text);
          await input.createNote({
            content: appendNoteAttachments(text, [...input.uploadedFiles]),
            ...(title ? { title } : {}),
          });
          input.clearDraft();
          input.clearUploadedFiles();
        });
      },
    },
    secondary: {
      execute: async () => {
        if (!hasContent) return;

        await input.runWithSubmitLock(async () => {
          if (input.posture === 'reply') {
            const title = toNoteTitle(text);
            await input.createNote({
              content: appendNoteAttachments(text, [...input.uploadedFiles]),
              ...(title ? { title } : {}),
            });
            input.clearDraft();
            input.clearUploadedFiles();
            return;
          }

          const seedText =
            input.posture === 'draft' && input.noteTitle
              ? `[Regarding note: "${input.noteTitle}"]\n\n${text}`
              : text;
          const title = toNoteTitle(text, input.posture === 'draft' ? 'Note chat' : 'New session');
          const chat = await input.createChat({
            seedText: appendChatAttachmentContext(seedText, [...input.uploadedFiles]),
            title,
          });
          input.clearDraft();
          input.clearUploadedFiles();
          input.navigate(`/chat/${chat.id}`);
        });
      },
    },
  };
}
