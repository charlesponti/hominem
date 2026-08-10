import type { ChatMessageItem } from '@hominem/chat';

import { useCopyMessage } from '~/hooks/use-message-actions';

import { ActionIconButton } from './chat-action-icon-button';

export function ChatCopyButton({ message }: { message: ChatMessageItem }) {
  const copyMessage = useCopyMessage();

  return (
    <ActionIconButton
      disabled={message.isStreaming}
      icon="doc.on.doc"
      onPress={() => void copyMessage(message)}
    />
  );
}
