import type { ChatMessageItem } from '@hominem/chat';

import { useShareMessage } from '~/hooks/use-message-actions';

import { ActionIconButton } from './chat-action-icon-button';

export function ChatShareButton({ message }: { message: ChatMessageItem }) {
  const shareMessage = useShareMessage();
  const { role, message: content, isStreaming } = message;
  const isUser = role.toLowerCase() === 'user';
  const canShare = !isUser && !isStreaming && Boolean(content?.trim());

  if (!canShare) {
    return null;
  }

  return <ActionIconButton icon="square.and.arrow.up" onPress={() => void shareMessage(message)} />;
}
