import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

import type { ComposerProps, ComposerSubmitKind } from '~/components/composer/composer.types';
import { useAutoUpdateChatTitle } from '~/services/chat';
import { clearChatDraft, readChatDraft, writeChatDraft } from '~/services/navigation/launch-state';

import { useNoteSubmission } from './useNoteSubmission';
import { useStartChatSubmission } from './useStartChatSubmission';

export type { ComposerSubmitKind } from '~/components/composer/composer.types';

interface ComposerSubmitInput {
  canSubmit: boolean;
  clearComposer: () => void;
  fileIds: string[];
  message: string;
  responseModality?: 'text' | 'audio';
  /** See `SendInput.messageId` -- threaded through for the toast handoff. */
  messageId?: string;
}

const EMPTY_CHAT_SEND = {
  sendChatMessage: async () => {},
  isChatSending: false,
};

// Coordinates the composer's mode-specific submission workflows and draft
// state. Chat transport and stream lifecycle remain owned by useSendMessage.
export function useComposerSubmission(props: ComposerProps) {
  const { isSaving, submitNote } = useNoteSubmission();
  const { isStartingChat, submitStartChat } = useStartChatSubmission();
  const chatId = props.mode === 'chat' ? props.chatId : '';
  const chatSend = props.mode === 'chat' ? props.chatSend : EMPTY_CHAT_SEND;
  const { sendChatMessage, isChatSending } = chatSend;
  const autoUpdateChatTitle = useAutoUpdateChatTitle(chatId);

  const isInbox = props.mode === 'inbox';
  const onComplete = isInbox ? props.onComplete : undefined;
  const initialMessage = isInbox ? props.initialMessage : readChatDraft(props.chatId);
  const writeChatDraftForId = useCallback(
    (message: string) => writeChatDraft(chatId, message),
    [chatId],
  );
  const clearChatDraftForId = useCallback(() => clearChatDraft(chatId), [chatId]);
  const onDraftChange = isInbox ? props.onDraftChange : writeChatDraftForId;
  const onClearDraft = isInbox ? props.onClearDraft : clearChatDraftForId;

  const submit = useCallback(
    async (
      { canSubmit, clearComposer, fileIds, message, messageId, responseModality }: ComposerSubmitInput,
      kind: ComposerSubmitKind,
    ) => {
      if (!canSubmit) return;

      if (kind === 'note') {
        await submitNote({ clearComposer, fileIds, message });
        return;
      }

      if (kind === 'start-chat') {
        await submitStartChat({
          clearComposer,
          fileIds,
          message,
          onComplete,
        });
        return;
      }

      if (isChatSending) return;

      const trimmedMessage = message.trim();
      const sendPromise = sendChatMessage({
        message: trimmedMessage,
        fileIds,
        noteIds: [],
        responseModality,
        messageId,
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      clearComposer();

      try {
        await sendPromise;
        void autoUpdateChatTitle(trimmedMessage);
      } catch {
        // Failure is surfaced inline in the transcript.
      }
    },
    [autoUpdateChatTitle, isChatSending, onComplete, sendChatMessage, submitNote, submitStartChat],
  );

  const isSubmitting = isInbox ? isSaving || isStartingChat : isChatSending;

  return {
    initialMessage,
    isSubmitting,
    onClearDraft,
    onDraftChange,
    submit,
  };
}
