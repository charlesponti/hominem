import type { ChatMessageItem } from '@hominem/chat';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';

import { useAppTheme, useStyles } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { nativeMotionContracts } from '~/services/motion/native-motion';
import t from '~/translations';

import { ActiveMessageActions } from './chat-message-actions';
import { MessageContent } from './chat-message-content';
import { MessageDebug } from './chat-message-debug';
import { MessageEditModal } from './chat-message-edit-modal';
import { MessageToolCalls } from './chat-message-tool-calls';
import { ChatThinkingIndicator } from './chat-thinking-indicator';

type ChatMessageProps = {
  message: ChatMessageItem;
  showDebug?: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  isActive?: boolean;
  onActivate?: (messageId: string) => void;
  formatTimestamp: (value: string) => string;
  /**
   * True only for a row that was just added to the list this session (a
   * freshly sent user message), as opposed to a historical row present when
   * the screen or a page of history first loaded. Gates the row's entrance
   * animation so opening a chat doesn't replay it for every existing message.
   */
  isNewMessage?: boolean;
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
  isNewMessage = false,
}: ChatMessageProps) {
  const {
    foreground: textPrimary,
    primaryForeground,
    destructive,
    tertiary,
  } = useAppTheme().colors;
  const styles = useStyles((theme) => ({
    content: { gap: 8, width: '100%' },
    reasoningPanel: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 6,
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 12,
      width: '100%',
    },
    reasoningText: { ...theme.textVariants.mono, color: theme.colors.foreground, opacity: 0.8 },
    retryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
    interruptedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    message: { width: '100%' },
    messageUser: { alignItems: 'flex-end' },
    messageAssistant: { alignItems: 'flex-start' },
    userBubble: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadii.sm,
      borderBottomRightRadius: 2,
      paddingHorizontal: 12,
    },
    assistantBubble: {
      borderRadius: theme.borderRadii.sm,
      borderBottomLeftRadius: 2,
      paddingHorizontal: 12,
    },
    continuous: { borderCurve: 'continuous' },
  }));

  const { role, message: content, isStreaming, failed } = message;
  const isUser = role.toLowerCase() === 'user';
  const handleActivate = useCallback(() => onActivate?.(message.id), [onActivate, message.id]);
  const reducedMotion = useReducedMotion();
  // A just-sent user message lifts and fades in from its own list position;
  // historical rows (chat open, pagination) mount with no entrance.
  const rowEntering =
    isUser && isNewMessage
      ? reducedMotion
        ? FadeIn.duration(nativeMotionContracts.duration.quick)
        : FadeInDown.duration(nativeMotionContracts.duration.quick)
      : undefined;
  // The row settles its own height when the printer indicator is removed,
  // Markdown reflows in, or a failure/retry banner appears or clears,
  // instead of jumping. A no-op for rows whose height never changes.
  const rowLayout = reducedMotion
    ? undefined
    : LinearTransition.duration(nativeMotionContracts.duration.quick);
  // A message that's already failed the moment this row first mounts is
  // historical (loaded on chat open, or a background/foreground reconcile),
  // not a failure the user just watched happen -- it must appear static,
  // never animate in. Flips to false after the first commit, so a *later*
  // failure (this row's own stream interrupting, or a retry failing again)
  // still animates normally.
  const skipInitialBannerEntranceRef = useRef(failed);
  useEffect(() => {
    skipInitialBannerEntranceRef.current = false;
  }, []);
  const bannerEntering = skipInitialBannerEntranceRef.current
    ? undefined
    : reducedMotion
      ? FadeIn.duration(nativeMotionContracts.duration.quick)
      : FadeInDown.duration(nativeMotionContracts.duration.quick);
  const bannerExiting = reducedMotion
    ? FadeOut.duration(nativeMotionContracts.duration.quick)
    : FadeOutUp.duration(nativeMotionContracts.duration.quick);
  const timestamp = message.created_at ? formatTimestamp(message.created_at) : '';
  const canRegenerate = !isUser && !isStreaming && !failed && onRegenerate !== undefined;
  const canEdit = isUser && !isStreaming && onEdit !== undefined;
  const canDelete = !isStreaming && onDelete !== undefined;
  const hasReasoning = Boolean(message.reasoning && message.reasoning.trim().length > 0);
  const renderedToolCalls = message.toolCalls ?? [];
  const [isEditing, setIsEditing] = useState(false);
  const [draftMessage, setDraftMessage] = useState(content);

  const textStyle = useMemo(
    () => ({
      color: isUser ? primaryForeground : textPrimary,
      fontSize: 16,
      lineHeight: isUser ? 24 : 25.6,
    }),
    [isUser, primaryForeground, textPrimary],
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
    <Animated.View
      layout={rowLayout}
      entering={rowEntering}
      style={[styles.message, isUser ? styles.messageUser : styles.messageAssistant]}
    >
      <MessageToolCalls toolCalls={renderedToolCalls} />
      <Pressable
        onPress={isStreaming ? undefined : handleActivate}
        style={[isUser ? styles.userBubble : styles.assistantBubble, isUser && styles.continuous]}
        testID={`chat-message-${message.id}`}
      >
        {!isUser && hasReasoning ? (
          <View style={styles.reasoningPanel}>
            <Text style={styles.reasoningText}>{message.reasoning}</Text>
          </View>
        ) : null}
        <MessageEditModal
          content={content}
          draftMessage={draftMessage}
          onCancel={closeEdit}
          onChangeDraft={setDraftMessage}
          onSave={saveEdit}
          visible={isEditing}
        />

        <View style={styles.content}>
          <MessageContent content={content} enableMarkdown={!isStreaming} textStyle={textStyle}>
            {!isUser && isStreaming ? <ChatThinkingIndicator compact /> : null}
          </MessageContent>

          {failed && isUser ? (
            <Animated.View entering={bannerEntering} exiting={bannerExiting}>
              <Pressable
                accessibilityLabel={t.chat.retryMessageA11y}
                accessibilityRole="button"
                style={styles.retryRow}
                onPress={() => onRetry?.(message.id)}
              >
                <AppIcon name="exclamationmark.circle.fill" size={13} tintColor={destructive} />
                <Text style={{ color: destructive, fontSize: 12 }}>
                  {message.error || t.chat.failedToSend} · {t.chat.tapToRetry}
                </Text>
              </Pressable>
            </Animated.View>
          ) : null}

          {failed && !isUser ? (
            <Animated.View entering={bannerEntering} exiting={bannerExiting}>
              <View style={styles.interruptedRow}>
                <AppIcon name="exclamationmark.circle" size={13} tintColor={tertiary} />
                <Text style={{ color: tertiary, fontSize: 12 }}>{t.chat.responseInterrupted}</Text>
              </View>
            </Animated.View>
          ) : null}

          {showDebug && !isStreaming ? (
            <MessageDebug hasReasoning={hasReasoning} message={message} />
          ) : null}
        </View>
      </Pressable>
      <ActiveMessageActions
        actions={{ canDelete, canEdit, canRegenerate }}
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
    </Animated.View>
  );
});
