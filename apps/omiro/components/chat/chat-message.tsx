import type { ChatMessageItem } from '@hominem/chat';
import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import AppIcon from '~/components/ui/icon';
import { nativeMotionTiming } from '~/services/motion/native-motion';
import t from '~/translations';

import { ActiveMessageActions } from './chat-message-actions';
import { MessageContent } from './chat-message-content';
import { MessageDebug } from './chat-message-debug';
import { MessageEditModal } from './chat-message-edit-modal';
import { FocusItems } from './chat-message-focus-items';
import { ReferencedNotes } from './chat-message-referenced-notes';
import { MessageToolCalls } from './chat-message-tool-calls';
import { useChatMotionOverlay } from './chat-motion-overlay';
import { ChatThinkingIndicator } from './chat-thinking-indicator';

// Generous multiple of the toast flight's own duration (nativeMotionTiming
// quick/enter, both well under 300ms). If the overlay never calls dismiss --
// a measurement failure, a stuck animation -- the row must still reveal
// itself rather than stay invisible forever.
const HANDOFF_REVEAL_FALLBACK_MS = 1500;

type ChatMessageProps = {
  message: ChatMessageItem;
  showDebug?: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
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
  onRetry,
  isActive = false,
  onActivate,
  formatTimestamp,
}: ChatMessageProps) {
  const [textPrimary, destructive, tertiary] = useCSSVariable([
    '--color-foreground',
    '--color-destructive',
    '--color-tertiary',
  ]) as string[];

  const { role, message: content, isStreaming, failed } = message;
  const isUser = role.toLowerCase() === 'user';
  const overlay = useChatMotionOverlay();
  const inFlight = isUser && overlay.isInFlight(message.renderKey ?? message.id);
  const revealOpacity = useSharedValue(inFlight ? 0 : 1);

  useEffect(() => {
    if (!inFlight) {
      revealOpacity.value = withTiming(1, nativeMotionTiming.quick);
      return;
    }
    // Safety net for a flight that never calls dismiss -- see the constant.
    const fallback = setTimeout(() => {
      revealOpacity.value = withTiming(1, nativeMotionTiming.quick);
    }, HANDOFF_REVEAL_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, [inFlight, revealOpacity]);

  const revealStyle = useAnimatedStyle(() => ({ opacity: revealOpacity.value }));
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

  return (
    <Animated.View style={revealStyle}>
      <Pressable
        onPress={isStreaming ? undefined : onActivate}
        className={isUser ? 'bg-popover rounded-lg px-2 py-2 w-full' : 'py-2 w-full'}
        style={isUser ? { borderCurve: 'continuous' } : undefined}
        testID={`chat-message-${message.id}`}
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
          {!isUser && isStreaming ? <ChatThinkingIndicator compact /> : null}
          {isUser ? <ReferencedNotes message={message} /> : null}
        </MessageContent>

        {failed && isUser ? (
          <Pressable
            accessibilityLabel={t.chat.retryMessageA11y}
            accessibilityRole="button"
            className="flex-row items-center gap-1 self-end"
            onPress={() => onRetry?.(message.id)}
          >
            <AppIcon name="exclamationmark.circle.fill" size={13} tintColor={destructive} />
            <Text style={{ color: destructive, fontSize: 12 }}>
              {message.error || t.chat.failedToSend} · {t.chat.tapToRetry}
            </Text>
          </Pressable>
        ) : null}

        {failed && !isUser ? (
          <View className="flex-row items-center gap-1">
            <AppIcon name="exclamationmark.circle" size={13} tintColor={tertiary} />
            <Text style={{ color: tertiary, fontSize: 12 }}>{t.chat.responseInterrupted}</Text>
          </View>
        ) : null}

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
    </Animated.View>
  );
});
