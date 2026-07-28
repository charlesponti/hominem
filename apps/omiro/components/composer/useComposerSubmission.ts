import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import type { ComposerProps, ComposerSubmitKind } from '~/components/composer/composer.types';
import {
  normalizeChatTitle,
  useAutoUpdateChatTitle,
  useSendMessage,
  useStartChatFromInbox,
} from '~/services/chat';
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
  const { startChat, isStartingChat } = useStartChatFromInbox();
  const chatId = props.mode === 'chat' ? props.chatId : '';
  const { sendChatMessage, isChatSending } = useSendMessage({ chatId });
  const autoUpdateChatTitle = useAutoUpdateChatTitle(chatId);

  const isInbox = props.mode === 'inbox';
  const onComplete = isInbox ? props.onComplete : undefined;
  const initialMessage = isInbox ? props.initialMessage : readChatDraft(props.chatId);
  const onDraftChange = isInbox
    ? props.onDraftChange
    : (message: string) => writeChatDraft(props.chatId, message);
  const onClearDraft = isInbox ? props.onClearDraft : () => clearChatDraft(props.chatId);

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
      await sendChatMessage({ message: message.trim(), fileIds, noteIds: [], responseModality });
      await autoUpdateChatTitle(message.trim());
      clearComposer();
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
