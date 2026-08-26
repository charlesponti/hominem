import { useCallback } from 'react';
import { Alert } from 'react-native';

import { normalizeChatTitle, useStartChat } from '~/services/chat';
import { isOfflineUnavailable } from '~/services/chat/chat-errors';

interface StartChatSubmissionInput {
  clearComposer: () => void;
  fileIds: string[];
  message: string;
  onComplete?: () => void;
}

export function useStartChatSubmission() {
  const { startChat, isStartingChat } = useStartChat();

  const submitStartChat = useCallback(
    async ({ clearComposer, fileIds, message, onComplete }: StartChatSubmissionInput) => {
      if (isStartingChat) return;

      try {
        await startChat({
          title: normalizeChatTitle(message),
          message: message.trim(),
          fileIds,
          onReady: () => {
            clearComposer();
            onComplete?.();
          },
        });
      } catch (error) {
        const alertMessage = isOfflineUnavailable(error)
          ? 'You appear to be offline. Please reconnect and try again.'
          : 'We could not start that chat right now. Please try again.';
        Alert.alert('Could not start chat', alertMessage, [{ text: 'OK' }]);
      }
    },
    [isStartingChat, startChat],
  );

  return { isStartingChat, submitStartChat };
}
