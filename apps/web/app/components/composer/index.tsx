/**
 * Composer — web translation of MobileComposer
 *
 * Layout is pixel-faithful to the mobile design:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  [textarea — grows with content, taller in draft mode]   │
 *   │  [note context chips — if attached in chat mode]         │
 *   │  ──────────────────────────────────────────────────────  │
 *   │  [●][●][●]                    [secondary ○] [primary ●]  │
 *   │  left tools (38×38 bordered)        right actions        │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Posture:
 *   capture  — focus/home: primary=Save note, secondary=Ask assistant
 *   draft    — note detail: primary=Add to note, secondary=Discuss note
 *   reply    — chat: primary=Send (arrow-up), secondary=Save as note
 *   hidden   — no composer rendered (settings etc.)
 *
 * No intent toggle — posture and route determine button roles exactly
 * as on mobile. Enter commits the primary action.
 */

import { useHonoMutation } from '@hominem/rpc/react';
import { useCallback, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';

import { ChatModals } from '~/components/chat/ChatModals';
import { useCreateNote, useUpdateNote } from '~/hooks/use-notes';
import { useFileUpload } from '~/lib/hooks/use-file-upload';
import { useSendMessage } from '~/lib/hooks/use-send-message';
import type { UploadedFile } from '~/lib/types/upload';

import { ComposerAttachmentList } from './composer-attachment-list';
import { AttachedNotesList } from './attached-notes-list';
import { resolveComposerActions } from './composer-actions';
import { ComposerActionsRow } from './composer-actions-row';
import { useComposer } from './composer-provider';
import { deriveComposerPresentation } from './composer-presentation';
import { ComposerShell } from './composer-shell';
import { ComposerTools } from './composer-tools';
import { useComposerMode } from './use-composer-mode';
import { NotePicker } from './note-picker';

export function Composer() {
  const navigate = useNavigate();
  const { mode, noteId, chatId } = useComposerMode();

  const {
    draftText,
    setDraftText,
    clearDraft,
    noteTitle,
    attachedNotes,
    clearAttachedNotes,
    detachNote,
    containerRef: cardRef,
    inputRef,
  } = useComposer();

  const [showVoice, setShowVoice] = useState(false);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const isSubmittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const presentation = deriveComposerPresentation(mode, isRecording);
  if (presentation.posture === 'hidden') return null;

  // ─── Mutations ──────────────────────────────────────────────────────────

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const sendMessage = useSendMessage({ chatId: chatId ?? '' });
  const { uploadFiles, uploadState, removeFile, clearAll } = useFileUpload();

  const createChatMutation = useHonoMutation<{ id: string }, { seedText: string; title: string }>(
    async ({ chats }, body) => {
      const chat = await chats.create({ title: body.title });
      if (body.seedText.trim()) {
        await chats.send({ chatId: chat.id, message: body.seedText });
      }
      return chat;
    },
  );

  const runWithSubmitLock = useCallback(async (task: () => Promise<void>) => {
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await task();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  const actions = resolveComposerActions({
    posture: presentation.posture,
    draftText,
    noteId,
    noteTitle,
    chatId,
    attachedNotes,
    uploadedFiles,
    isUploadingAttachments: uploadState.isUploading,
    isSubmitting,
    createNote: createNote.mutateAsync,
    updateNote: updateNote.mutateAsync,
    sendMessage: sendMessage.mutateAsync,
    createChat: createChatMutation.mutateAsync,
    clearDraft,
    clearAttachedNotes,
    clearUploadedFiles: () => {
      setUploadedFiles([]);
      clearAll();
    },
    navigate: (path: string) => {
      void navigate(path);
    },
    runWithSubmitLock,
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!actions.canSubmit) return;
        void actions.primary.execute();
      }
    },
    [actions],
  );

  const handleAudioTranscribed = useCallback(
    (transcript: string) => {
      setDraftText(transcript);
      setShowVoice(false);
      setIsRecording(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [setDraftText, inputRef],
  );

  const handleCloseNotePicker = useCallback(() => {
    setShowNotePicker(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [inputRef]);

  const isDraftMode = presentation.posture === 'draft';

  const handleFilesSelected = useCallback(async (files: FileList | File[] | null) => {
    if (!files || Array.from(files).length === 0) return;
    const newFiles = await uploadFiles(files);
    if (newFiles.length === 0) return;
    setUploadedFiles((prev) => [...prev, ...newFiles.filter((file) => !prev.some((current) => current.id === file.id))]);
  }, [uploadFiles]);

  const handleFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      await handleFilesSelected(event.target.files);
      event.target.value = '';
      inputRef.current?.focus();
    },
    [handleFilesSelected, inputRef],
  );

  const handleRemoveUploadedFile = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
    removeFile(fileId);
  }, [removeFile]);

  return (
    <>
      <input
        ref={fileInputRef}
        data-testid="composer-file-input"
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFileInputChange(event);
        }}
      />
      <input
        ref={cameraInputRef}
        data-testid="composer-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleFileInputChange(event);
        }}
      />

      <ComposerShell
        cardRef={cardRef}
        draftText={draftText}
        inputRef={inputRef}
        isDraftMode={isDraftMode}
        isSubmitting={isSubmitting}
        onDraftTextChange={setDraftText}
        onKeyDown={handleKeyDown}
        placeholder={presentation.placeholder}
        attachments={(
          <>
            <ComposerAttachmentList
              errors={uploadState.errors}
              files={uploadedFiles}
              onRemove={handleRemoveUploadedFile}
            />
            <AttachedNotesList notes={attachedNotes} onRemove={detachNote} />
          </>
        )}
        tools={
          <ComposerTools
            attachedNotesCount={attachedNotes.length}
            isRecording={isRecording}
            showsAttachmentButton={presentation.showsAttachmentButton}
            showsNotePicker={presentation.showsNotePicker}
            showsVoiceButton={presentation.showsVoiceButton}
            onAttachmentClick={() => fileInputRef.current?.click()}
            onCameraClick={() => cameraInputRef.current?.click()}
            onNotePickerClick={() => setShowNotePicker(true)}
            onVoiceClick={() => {
              if (isRecording) {
                setIsRecording(false);
              } else {
                setIsRecording(true);
                setShowVoice(true);
              }
            }}
          />
        }
        actions={
          <ComposerActionsRow
            primaryActionIcon={presentation.primaryActionIcon}
            primaryActionLabel={presentation.primaryActionLabel}
            onPrimaryClick={() => void actions.primary.execute()}
            secondaryActionIcon={presentation.secondaryActionIcon}
            secondaryActionLabel={presentation.secondaryActionLabel}
            onSecondaryClick={() => void actions.secondary.execute()}
            disabled={!actions.canSubmit}
          />
        }
      />

      <NotePicker open={showNotePicker} onClose={handleCloseNotePicker} />
      <ChatModals
        showAudioRecorder={showVoice}
        onCloseAudioRecorder={() => {
          setShowVoice(false);
          setIsRecording(false);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        onAudioTranscribed={handleAudioTranscribed}
      />
    </>
  );
}
