import type { ChatMessageItem } from '@hominem/chat';
import { memo, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { ActiveMessageActions } from './chat-message-actions';
import { MessageContent } from './chat-message-content';
import { MessageDebug } from './chat-message-debug';
import { MessageEditModal } from './chat-message-edit-modal';
import { FocusItems } from './chat-message-focus-items';
import { ReferencedNotes } from './chat-message-referenced-notes';
import { MessageToolCalls } from './chat-message-tool-calls';
import { ChatThinkingIndicator } from './chat-thinking-indicator';

type ChatMessageProps = {
  message: ChatMessageItem;
  showDebug?: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  isActive?: boolean;
  onActivate?: () => void;
  formatTimestamp: (value: string) => string;
};

export const ChatMessage = memo(function ChatMessage({
  message,
  showDebug = false,
  onEdit,
  onRegenerate,
  onDelete,
  isActive = false,
  onActivate,
  formatTimestamp,
}: ChatMessageProps) {
  const [textPrimary] = useCSSVariable(['--color-foreground']) as string[];

  const { role, message: content, isStreaming } = message;
  const isUser = role.toLowerCase() === 'user';
  const timestamp = message.created_at ? formatTimestamp(message.created_at) : '';
  const canRegenerate = !isUser && !isStreaming && onRegenerate !== undefined;
  const canEdit = isUser && !isStreaming && onEdit !== undefined;
  const canDelete = !isStreaming && onDelete !== undefined;
  const hasReasoning = Boolean(message.reasoning && message.reasoning.trim().length > 0);
  const renderedToolCalls = message.toolCalls ?? [];
  const [isEditing, setIsEditing] = useState(false);
  const [draftMessage, setDraftMessage] = useState(content);

  const textStyle = useMemo(
    () => ({
      color: textPrimary,
      fontSize: 16,
      lineHeight: isUser ? 24 : 25.6,
    }),
    [textPrimary, isUser],
  );

  const closeEdit = () => {
    setDraftMessage(content);
    setIsEditing(false);
  };

  const saveEdit = () => {
    const trimmedContent = draftMessage.trim();
    if (!trimmedContent) return;
    onEdit?.(message.id, trimmedContent);
    setIsEditing(false);
  };

  if (isStreaming && !content) {
    return <ChatThinkingIndicator />;
  }

  return (
    <Pressable
      onPress={isStreaming ? undefined : onActivate}
      className={isUser ? 'bg-popover rounded-lg px-2 py-2 w-full' : 'py-2 w-full'}
      style={isUser ? { borderCurve: 'continuous' } : undefined}
    >
      <MessageEditModal
        content={content}
        draftMessage={draftMessage}
        onCancel={closeEdit}
        onChangeDraft={setDraftMessage}
        onSave={saveEdit}
        visible={isEditing}
      />

      <View className="gap-2 w-full">
        {!isUser && hasReasoning ? (
          <View className="bg-background border border-border rounded-md gap-1 px-3 py-3 w-full">
            <Text className="text-mono text-foreground opacity-80">{message.reasoning}</Text>
          </View>
        ) : null}

        <MessageToolCalls toolCalls={renderedToolCalls} />

        <MessageContent content={content} enableMarkdown={!isStreaming} textStyle={textStyle}>
          {isUser ? <ReferencedNotes message={message} /> : null}
        </MessageContent>

        {showDebug && !isStreaming ? (
          <MessageDebug hasReasoning={hasReasoning} message={message} />
        ) : null}

        {!isStreaming ? <FocusItems message={message} /> : null}

        <ActiveMessageActions
          canDelete={canDelete}
          canEdit={canEdit}
          canRegenerate={canRegenerate}
          isActive={isActive}
          isUser={isUser}
          message={message}
          onDelete={onDelete}
          onEdit={() => {
            setDraftMessage(content);
            setIsEditing(true);
          }}
          onRegenerate={onRegenerate}
          timestamp={timestamp}
        />
      </View>
    </Pressable>
  );
});
