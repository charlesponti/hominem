import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { normalizeChatTitle, useStartChat } from '~/services/chat';
import { isOfflineUnavailable } from '~/services/chat/chat-errors';
import { getContentRoute } from '~/services/navigation/routes';

interface StartChatSubmissionInput {
  clearComposer: () => void;
  fileIds: string[];
  message: string;
  onComplete?: () => void;
  onStartChatAccepted?: (chatId: string) => void;
}

export function useStartChatSubmission() {
  const { startChat, isStartingChat } = useStartChat();
  const router = useRouter();

  const submitStartChat = useCallback(
    async ({
      clearComposer,
      fileIds,
      message,
      onComplete,
      onStartChatAccepted,
    }: StartChatSubmissionInput) => {
      if (isStartingChat) return;

      try {
        await startChat({
          title: normalizeChatTitle(message),
          message: message.trim(),
          fileIds,
          onAccepted: (event) => {
            clearComposer();
            onComplete?.();
            if (onStartChatAccepted) {
              onStartChatAccepted(event.payload.chatId);
              return;
            }
            router.push(getContentRoute('chat', event.payload.chatId));
          },
        });
      } catch (error) {
        const alertMessage = isOfflineUnavailable(error)
          ? 'You appear to be offline. Please reconnect and try again.'
          : 'We could not start that chat right now. Please try again.';
        Alert.alert('Could not start chat', alertMessage, [{ text: 'OK' }]);
      }
    },
    [isStartingChat, router, startChat],
  );

  return { isStartingChat, submitStartChat };
}
