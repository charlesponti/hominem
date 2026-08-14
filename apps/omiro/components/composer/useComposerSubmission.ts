import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import type { ComposerProps, ComposerSubmitKind } from '~/components/composer/composer.types';
import { normalizeChatTitle, useAutoUpdateChatTitle, useStartChat } from '~/services/chat';
import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { donateAddNoteIntent } from '~/services/intent-donation';
import { clearChatDraft, readChatDraft, writeChatDraft } from '~/services/navigation/launch-state';
import { useCreateNote } from '~/services/notes/use-create-note';

export type { ComposerSubmitKind } from '~/components/composer/composer.types';

interface ComposerSubmitInput {
  canSubmit: boolean;
  clearComposer: () => void;
  fileIds: string[];
  message: string;
  responseModality?: 'text' | 'audio';
}

// Owns the actual submit actions (save note / start chat / send message) and,
// per mode, where the draft comes from and how it's persisted:
// inbox mode delegates draft storage to the caller via props; chat mode
// persists to launch-state so a draft survives the app being killed mid-chat.
export function useComposerSubmission(props: ComposerProps) {
  const queryClient = useQueryClient();
  const { mutateAsync: createNote, isPending: isSaving } = useCreateNote();
  const { startChat, isStartingChat } = useStartChat();
  const chatId = props.mode === 'chat' ? props.chatId : '';
  // Chat-mode sending is owned by the screen and passed via chatSend so normal
  // sends and transcript retries share one in-flight mutation.
  const { sendChatMessage, isChatSending } =
    props.mode === 'chat'
      ? props.chatSend
      : { sendChatMessage: async () => {}, isChatSending: false };
  const autoUpdateChatTitle = useAutoUpdateChatTitle(chatId);

  const isInbox = props.mode === 'inbox';
  const onComplete = isInbox ? props.onComplete : undefined;
  const initialMessage = isInbox ? props.initialMessage : readChatDraft(props.chatId);
  // Stable across renders (keyed only on chatId) so consumers that memoize on
  // these -- useComposerDraft's setMessage, useComposerController's
  // clearComposer -- don't churn identity on every unrelated re-render.
  const writeChatDraftForId = useCallback(
    (message: string) => writeChatDraft(chatId, message),
    [chatId],
  );
  const clearChatDraftForId = useCallback(() => clearChatDraft(chatId), [chatId]);
  const onDraftChange = isInbox ? props.onDraftChange : writeChatDraftForId;
  const onClearDraft = isInbox ? props.onClearDraft : clearChatDraftForId;

  const submit = useCallback(
    async (
      { canSubmit, clearComposer, fileIds, message, responseModality }: ComposerSubmitInput,
      kind: ComposerSubmitKind,
    ) => {
      if (!canSubmit) return;

      // Each branch re-checks its own in-flight flag (isSaving/isStartingChat/
      // isChatSending) in addition to canSubmit, since canSubmit is memoized
      // from render state and can lag a rapid double-tap by one frame.
      if (kind === 'note') {
        if (isSaving) return;
        await createNote({ text: message.trim(), fileIds });
        donateAddNoteIntent();
        await invalidateInboxQueries(queryClient);
        clearComposer();
        return;
      }

      if (kind === 'start-chat') {
        if (isStartingChat) return;

        try {
          await startChat({
            title: normalizeChatTitle(message),
            message: message.trim(),
            fileIds,
            noteIds: [],
            onReady: () => {
              clearComposer();
              onComplete?.();
            },
          });
        } catch (error) {
          const alertMessage =
            error instanceof Error && error.message === 'offline_unavailable'
              ? 'You appear to be offline. Please reconnect and try again.'
              : 'We could not start that chat right now. Please try again.';
          Alert.alert('Could not start chat', alertMessage, [{ text: 'OK' }]);
        }
        return;
      }

      if (isChatSending) return;
      const trimmedMessage = message.trim();
      const sendPromise = sendChatMessage({
        message: trimmedMessage,
        fileIds,
        noteIds: [],
        responseModality,
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      clearComposer();
      try {
        await sendPromise;
        void autoUpdateChatTitle(trimmedMessage);
      } catch {
        // Failure is surfaced inline in the transcript.
      }
    },
    [
      autoUpdateChatTitle,
      createNote,
      queryClient,
      isChatSending,
      isSaving,
      isStartingChat,
      onComplete,
      sendChatMessage,
      startChat,
    ],
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
