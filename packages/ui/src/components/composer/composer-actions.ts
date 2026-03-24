import { CHAT_TITLE_MAX_LENGTH } from '@hominem/chat-services';
import { useRpcMutation } from '@hominem/rpc/react';
import type { Note } from '@hominem/rpc/types/notes.types';
import { useCallback, type KeyboardEvent } from 'react';

import type { UploadedFile } from '../../types/upload';
import { appendChatAttachmentContext, appendNoteAttachments } from './composer-attachments';
import type { ComposerPosture } from './composer-presentation';
import {
  useComposerAttachedNotes,
  useComposerDataDeps,
  useComposerDraftActions,
  useComposerDraftState,
  useComposerNoteTitle,
  useComposerSubmission,
  useComposerUploadActions,
  useComposerUploadState,
} from './composer-provider';

interface CreateNoteInput {
  content: string;
  title?: string;
}

interface UpdateNoteInput {
  id: string;
  content: string;
}

interface CreateChatInput {
  seedText: string;
  title: string;
}

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
  attachedNotes: Note[];
  uploadedFiles: UploadedFile[];
  isUploadingAttachments: boolean;
  isSubmitting: boolean;
  createNote: (input: CreateNoteInput) => Promise<unknown>;
  updateNote: (input: UpdateNoteInput) => Promise<unknown>;
  sendMessage: (input: { chatId: string; message: string }) => Promise<unknown>;
  createChat: (input: CreateChatInput) => Promise<{ id: string }>;
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
            const message = appendChatAttachmentContext(
              prefix ? `${prefix}${text}` : text,
              input.uploadedFiles,
            );
            await input.sendMessage({ chatId: input.chatId, message });
            input.clearDraft();
            input.clearAttachedNotes();
            input.clearUploadedFiles();
            return;
          }

          if (input.posture === 'draft' && input.noteId) {
            await input.updateNote({
              id: input.noteId,
              content: appendNoteAttachments(text, input.uploadedFiles),
            });
            input.clearDraft();
            input.clearUploadedFiles();
            return;
          }

          const title = toTitle(text);
          await input.createNote({
            content: appendNoteAttachments(text, input.uploadedFiles),
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
            const title = toTitle(text);
            await input.createNote({
              content: appendNoteAttachments(text, input.uploadedFiles),
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
          const title = toTitle(text, input.posture === 'draft' ? 'Note chat' : 'New session');
          const chat = await input.createChat({
            seedText: appendChatAttachmentContext(seedText, input.uploadedFiles),
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

export interface UseComposerActionsInput {
  posture: ComposerPosture;
  noteId: string | null;
  chatId: string | null;
  navigate: (path: string) => void;
}

export function useComposerActions({ posture, noteId, chatId, navigate }: UseComposerActionsInput) {
  const { draftText } = useComposerDraftState();
  const { clearDraft } = useComposerDraftActions();
  const { attachedNotes, clearAttachedNotes } = useComposerAttachedNotes();
  const { noteTitle } = useComposerNoteTitle();
  const { uploadState } = useComposerUploadState();
  const { clearUploadedFiles } = useComposerUploadActions();
  const { isSubmitting, runWithSubmitLock } = useComposerSubmission();
  const dataDeps = useComposerDataDeps();

  const createNote = dataDeps.useCreateNote();
  const updateNote = dataDeps.useUpdateNote();
  const sendMessage = dataDeps.useSendMessage({ chatId: chatId ?? '' });

  const createChatMutation = useRpcMutation<{ id: string }, { seedText: string; title: string }>(
    async ({ chats }, body) => {
      const chat = await chats.create({ title: body.title });
      if (body.seedText.trim()) {
        await chats.send({ chatId: chat.id, message: body.seedText });
      }
      return chat;
    },
  );

  const actions = resolveComposerActions({
    posture,
    draftText,
    noteId,
    noteTitle,
    chatId,
    attachedNotes,
    uploadedFiles: uploadState.uploadedFiles,
    isUploadingAttachments: uploadState.isUploading,
    isSubmitting,
    createNote: createNote.mutateAsync,
    updateNote: updateNote.mutateAsync,
    sendMessage: sendMessage.mutateAsync,
    createChat: createChatMutation.mutateAsync,
    clearDraft,
    clearAttachedNotes,
    clearUploadedFiles,
    navigate,
    runWithSubmitLock,
  });

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (!actions.canSubmit) return;
        void actions.primary.execute();
      }
    },
    [actions],
  );

  return {
    canSubmit: actions.canSubmit,
    onKeyDown,
    primary: actions.primary,
    secondary: actions.secondary,
  };
}

function toTitle(text: string, fallback = ''): string {
  return text.slice(0, CHAT_TITLE_MAX_LENGTH) || fallback;
}

function buildNoteContext(attachedNotes: Note[]): string {
  if (attachedNotes.length === 0) return '';

  const sections = attachedNotes.map(
    (note) => `### ${note.title ?? 'Untitled note'}\n\n${note.content}`,
  );
  return `<context>\n${sections.join('\n\n---\n\n')}\n</context>\n\n`;
}
