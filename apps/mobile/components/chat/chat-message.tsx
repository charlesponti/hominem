import { chatTokensNative, fontFamiliesNative, fontSizes } from '@hominem/ui/tokens';
import React, { memo, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { Button } from '~/components/Button';
import AppIcon from '~/components/ui/icon';
import TextArea from '~/components/text-input-autogrow';
import { Text, makeStyles } from '~/theme';
import { getLocalDate } from '~/utils/dates';
import type { MessageOutput } from '~/utils/services/chat';

type ToolCall = NonNullable<MessageOutput['toolCalls']>[number];

type ChatMessageProps = {
  message: MessageOutput;
  Markdown?: React.ComponentType<{
    children: React.ReactNode;
    style?: Record<string, unknown>;
  }> | null;
  showDebug?: boolean;
  onCopy?: (message: MessageOutput) => void;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSpeak?: (message: MessageOutput) => void;
  isSpeaking?: boolean;
  onShare?: (message: MessageOutput) => void;
  isActive?: boolean;
  onActivate?: () => void;
};

export type MarkdownComponent = React.ComponentType<{
  children: React.ReactNode;
  style?: Record<string, unknown>;
}>;

export const loadMarkdown = async () => {
  const mod = await import('react-native-markdown-display');
  return mod.default as MarkdownComponent;
};

const ACTIONS_ENTERING = FadeInDown.duration(240).springify().damping(20).stiffness(220).mass(0.9)
const ACTIONS_EXITING = FadeOutUp.duration(180).springify().damping(24).stiffness(260).mass(0.8)
const ACTIONS_LAYOUT = LinearTransition.duration(200)

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    row: {
      width: '100%',
      paddingVertical: t.spacing.sm_8,
    },
    rowUser: {
      alignItems: 'flex-end',
    },
    rowAssistant: {
      alignItems: 'flex-start',
    },
    contentColumn: {
      width: '100%',
      gap: t.spacing.sm_8,
    },
    contentColumnUser: {
      width: '100%',
      alignItems: 'flex-end',
    },
    transcriptBlock: {
      width: '100%',
      gap: t.spacing.sm_12,
    },
    userSurface: {
      width: '100%',
      maxWidth: chatTokensNative.userBubbleMaxWidth,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_12,
      borderRadius: t.borderRadii.md,
      backgroundColor: t.colors['emphasis-highest'],
      borderWidth: 1,
      borderColor: t.colors['emphasis-highest'],
    },
    userMessageText: {
      fontSize: fontSizes.md,
      lineHeight: fontSizes.md * 1.5,
      color: t.colors.white,
    },
    assistantSurface: {
      width: '100%',
      maxWidth: chatTokensNative.userBubbleMaxWidth,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_12,
      borderRadius: t.borderRadii.md,
      borderTopLeftRadius: 6,
      backgroundColor: t.colors['bg-base'],
      borderWidth: 1,
      borderColor: t.colors['border-subtle'],
    },
    assistantMessageText: {
      fontSize: fontSizes.md,
      lineHeight: fontSizes.md * 1.55,
      color: t.colors.foreground,
    },
    transcriptSurface: {
      width: '100%',
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      backgroundColor: t.colors['bg-base'],
      paddingHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.sm_12,
      gap: t.spacing.xs_4,
    },
    focusItems: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.spacing.sm_12,
    },
    focusItem: {
      backgroundColor: t.colors['bg-base'],
      paddingHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.sm_8,
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    metadata: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: chatTokensNative.metadataGap,
      opacity: 0.64,
    },
    metadataEnd: {
      justifyContent: 'flex-end',
    },
    metadataText: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.xs,
      fontFamily: fontFamiliesNative.mono,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'nowrap',
      gap: t.spacing.sm_8,
      justifyContent: 'flex-end',
    },
    actionsWrap: {
      marginTop: t.spacing.xs_4,
    },
    actionButton: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      width: 32,
      height: 32,
      borderRadius: t.borderRadii.full,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    actionButtonDisabled: {
      opacity: 0.3,
    },
    actionIcon: {
      color: t.colors['text-tertiary'],
      opacity: 0.9,
    },
    reasoningText: {
      color: t.colors.foreground,
      fontSize: fontSizes.xs,
      opacity: 0.8,
      fontFamily: fontFamiliesNative.mono,
    },
    toolCalls: {
      gap: t.spacing.xs_4,
    },
    toolCall: {
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      borderColor: t.colors['border-subtle'],
      backgroundColor: t.colors['bg-base'],
      padding: t.spacing.sm_12,
      gap: t.spacing.xs_4,
    },
    toolCallName: {
      color: t.colors.foreground,
      fontSize: fontSizes.xs,
      fontWeight: '600',
    },
    toolCallArgs: {
      color: t.colors['text-secondary'],
      fontSize: fontSizes.xs,
      fontFamily: fontFamiliesNative.mono,
    },
    editBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.colors['overlay-modal-medium'],
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: t.spacing.ml_24,
    },
    editSheet: {
      width: '100%',
      borderRadius: t.borderRadii.md,
      backgroundColor: t.colors['bg-base'],
      borderWidth: 1,
      borderColor: t.colors['border-subtle'],
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.m_16,
      gap: t.spacing.sm_12,
    },
    editTitle: {
      color: t.colors.foreground,
      fontSize: 16,
    },
    editInput: {
      minHeight: 90,
    },
    editButtonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: t.spacing.sm_8,
    },
  }),
);

const ChatMessage = memo(
  ({
    message,
    Markdown,
    showDebug = false,
    onCopy,
    onEdit,
    onRegenerate,
    onDelete,
    onSpeak,
    isSpeaking = false,
    onShare,
    isActive = false,
    onActivate,
  }: ChatMessageProps) => {
    const styles = useStyles();
    const { role, message: content } = message;
    const isUser = role.toLowerCase() === 'user';
    const textStyle = isUser ? styles.userMessageText : styles.assistantMessageText;
    const timestamp = message.created_at
      ? getLocalDate(new Date(message.created_at)).localDateString
      : '';
    const canRegenerate = !isUser && onRegenerate !== undefined;
    const canEdit = isUser && onEdit !== undefined;
    const canDelete = onDelete !== undefined;
    const canCopy = onCopy !== undefined;
    const canSpeak = !isUser && onSpeak !== undefined && Boolean(content?.trim());
    const canShare = !isUser && onShare !== undefined && Boolean(content?.trim());
    const hasToolCalls = Array.isArray(message.toolCalls) && message.toolCalls.length > 0;
    const hasReasoning = Boolean(message.reasoning && message.reasoning.trim().length > 0);
    const renderedToolCalls = message.toolCalls ?? [];
    const [isEditing, setIsEditing] = useState(false);
    const [draftMessage, setDraftMessage] = useState(content);
    const markdownStyle = useMemo(
      () => ({
        body: (isUser ? styles.userMessageText : styles.assistantMessageText) as Record<
          string,
          unknown
        >,
      }),
      [isUser, styles.assistantMessageText, styles.userMessageText],
    );

    return (
      <Pressable onPress={onActivate} style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
        <Modal
          visible={isEditing}
          transparent
          animationType="fade"
          onRequestClose={() => setIsEditing(false)}
        >
          <View style={styles.editBackdrop}>
            <View style={styles.editSheet}>
              <Text style={styles.editTitle}>Edit message</Text>
              <TextArea
                label="Edit message"
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.nativeEvent.text)}
                style={styles.editInput}
                placeholder="Update your message"
              />
              <View style={styles.editButtonRow}>
                <Button
                  variant="outline"
                  size="sm"
                  title="cancel"
                  style={styles.actionButton}
                  onPress={() => {
                    setDraftMessage(content);
                    setIsEditing(false);
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  title="save"
                  style={styles.actionButton}
                  onPress={() => {
                    const trimmedContent = draftMessage.trim();
                    if (!trimmedContent) return;
                    onEdit?.(message.id, trimmedContent);
                    setIsEditing(false);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>

        <View style={[styles.contentColumn, isUser ? styles.contentColumnUser : null]}>
          {!isUser && hasReasoning ? (
            <View style={styles.transcriptSurface}>
              <Text style={styles.reasoningText}>{message.reasoning}</Text>
            </View>
          ) : null}

          {hasToolCalls && (
            <View style={styles.toolCalls}>
              {renderedToolCalls.map((toolCall: ToolCall, index: number) => (
                <View key={toolCall.toolCallId || `tool-call-${index}`} style={styles.toolCall}>
                  <Text style={styles.toolCallName}>{toolCall.toolName}</Text>
                  <Text style={styles.toolCallArgs}>
                    {toolCall.args ? JSON.stringify(toolCall.args, null, 2) : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {isUser ? (
            <View style={styles.userSurface}>
              {Markdown ? (
                <Markdown style={markdownStyle}>{content}</Markdown>
              ) : (
                <Text style={textStyle}>{content}</Text>
              )}
            </View>
          ) : (
            <View style={styles.transcriptBlock}>
              <View style={styles.assistantSurface}>
                {Markdown ? (
                  <Markdown style={markdownStyle}>{content}</Markdown>
                ) : (
                  <Text style={textStyle}>{content}</Text>
                )}
              </View>
            </View>
          )}

          {showDebug ? (
            <View style={styles.transcriptSurface}>
              <Text style={styles.reasoningText}>ID: {message.id}</Text>
              <Text style={styles.reasoningText}>Role: {message.role}</Text>
              <Text style={styles.reasoningText}>Created: {message.created_at ?? 'unknown'}</Text>
              <Text style={styles.reasoningText}>
                Reasoning: {hasReasoning ? 'present' : 'none'}
              </Text>
              <Text style={styles.reasoningText}>Tool calls: {message.toolCalls?.length ?? 0}</Text>
            </View>
          ) : null}

          {message.focus_items && message.focus_items.length > 0 ? (
            <View style={styles.focusItems}>
              {message.focus_items.map((focusItem) => (
                <View key={focusItem.id} style={styles.focusItem}>
                  <Text variant="body" color="foreground">
                    {focusItem.text}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {isActive ? (
            <Reanimated.View
              entering={ACTIONS_ENTERING}
              exiting={ACTIONS_EXITING}
              layout={ACTIONS_LAYOUT}
              style={styles.actionsWrap}
            >
            <View style={styles.actions}>
              {timestamp ? (
                <Text variant="caption" color="text-secondary" style={styles.metadataText}>
                  {timestamp}
                </Text>
              ) : null}
              <Button
                variant="ghost"
                size="icon-xs"
                onPress={() => onCopy?.(message)}
                disabled={!canCopy}
                accessibilityLabel="Copy message"
                style={[styles.actionButton, !canCopy && styles.actionButtonDisabled]}
              >
                <AppIcon name="copy" size={15} style={styles.actionIcon} useSymbol />
              </Button>
              {canSpeak ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onPress={() => onSpeak?.(message)}
                  style={styles.actionButton}
                  accessibilityLabel={isSpeaking ? 'Stop reading' : 'Read aloud'}
                >
                  <AppIcon
                    name={isSpeaking ? 'stop' : 'speaker'}
                    size={15}
                    style={styles.actionIcon}
                    useSymbol
                  />
                </Button>
              ) : null}
              {canShare ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onPress={() => onShare?.(message)}
                  style={styles.actionButton}
                  accessibilityLabel="Share message"
                >
                  <AppIcon name="share-from-square" size={15} style={styles.actionIcon} useSymbol />
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onPress={() => {
                    setDraftMessage(content);
                    setIsEditing(true);
                  }}
                  style={styles.actionButton}
                  accessibilityLabel="Edit message"
                >
                  <AppIcon name="pen-to-square" size={15} style={styles.actionIcon} useSymbol />
                </Button>
              ) : null}
              {canRegenerate ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onPress={() => onRegenerate?.(message.id)}
                  style={styles.actionButton}
                  accessibilityLabel="Regenerate response"
                >
                  <AppIcon name="arrows-rotate" size={15} style={styles.actionIcon} useSymbol />
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onPress={() => onDelete?.(message.id)}
                  style={styles.actionButton}
                  accessibilityLabel="Delete message"
                >
                  <AppIcon name="trash" size={15} style={styles.actionIcon} useSymbol />
                </Button>
              ) : null}
            </View>
            </Reanimated.View>
          ) : null}
        </View>
      </Pressable>
    );
  },
);

ChatMessage.displayName = 'ChatMessage';

export const renderMessage = (
  item: MessageOutput,
  Markdown?: MarkdownComponent | null,
  actions?: {
    showDebug?: boolean;
    onCopy?: (message: MessageOutput) => void;
    onEdit?: (messageId: string, content: string) => void;
    onRegenerate?: (messageId: string) => void;
    onDelete?: (messageId: string) => void;
    onSpeak?: (message: MessageOutput) => void;
    speakingId?: string | null;
    onShare?: (message: MessageOutput) => void;
    isActive?: boolean;
    onActivate?: () => void;
  },
) => {
  const { speakingId, ...rest } = actions ?? {};
  return (
    <ChatMessage
      message={item}
      Markdown={Markdown}
      isSpeaking={speakingId === item.id}
      {...rest}
    />
  );
};
