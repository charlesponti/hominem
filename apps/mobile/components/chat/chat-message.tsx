import { chatTokensNative, fontFamiliesNative, fontSizes } from '@hominem/ui/tokens';
import React, { memo, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { Button } from '~/components/Button';
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
};

export type MarkdownComponent = React.ComponentType<{
  children: React.ReactNode;
  style?: Record<string, unknown>;
}>;

export const loadMarkdown = async () => {
  const mod = await import('react-native-markdown-display');
  return mod.default as MarkdownComponent;
};

// Hoisted markdown style maps — stable references, no per-render allocation
const userMarkdownStyle = { body: {} as Record<string, unknown> };
const botMarkdownStyle = { body: {} as Record<string, unknown> };

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    row: {
      width: '100%',
      paddingVertical: chatTokensNative.turnPaddingY,
    },
    rowUser: {
      alignItems: 'flex-end',
    },
    rowAssistant: {
      alignItems: 'flex-start',
    },
    contentColumn: {
      width: '100%',
      gap: chatTokensNative.contentGap,
    },
    contentColumnUser: {
      width: '100%',
      alignItems: 'flex-end',
    },
    transcriptBlock: {
      width: '100%',
      gap: chatTokensNative.contentGap,
    },
    userSurface: {
      width: '100%',
      maxWidth: chatTokensNative.userBubbleMaxWidth,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_12,
      borderRadius: chatTokensNative.radii.bubble,
      backgroundColor: chatTokensNative.surfaces.user,
      borderWidth: 1,
      borderColor: chatTokensNative.borders.user,
    },
    userMessageText: {
      fontSize: 17,
      lineHeight: 24,
      color: chatTokensNative.foregrounds.user,
    },
    assistantMessageText: {
      fontSize: 18,
      lineHeight: 24,
      color: t.colors.foreground,
    },
    transcriptSurface: {
      width: '100%',
      borderRadius: chatTokensNative.radii.debug,
      borderWidth: 1,
      borderColor: chatTokensNative.borders.debug,
      backgroundColor: chatTokensNative.surfaces.debug,
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
      backgroundColor: t.colors['bg-surface'],
      paddingHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.sm_8,
      borderRadius: t.borderRadii.l_12,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    metadata: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: chatTokensNative.metadataGap,
      opacity: 0.7,
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
      flexWrap: 'wrap',
      gap: t.spacing.sm_8,
    },
    actionsEnd: {
      justifyContent: 'flex-end',
    },
    actionButton: {
      backgroundColor: t.colors['bg-surface'],
      borderColor: t.colors['border-default'],
    },
    actionButtonDisabled: {
      opacity: 0.35,
    },
    actionLabel: {
      color: t.colors['text-secondary'],
      fontSize: fontSizes.xs,
      textTransform: 'uppercase',
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
      borderRadius: t.borderRadii.md_10,
      borderWidth: 1,
      borderColor: t.colors['border-subtle'],
      backgroundColor: t.colors.muted,
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
      borderRadius: t.borderRadii.l_12,
      backgroundColor: t.colors.background,
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
  }: ChatMessageProps) => {
    const styles = useStyles();
    const { role, message: content } = message;
    const isUser = role.toLowerCase() === 'user';
    const textStyle = isUser ? styles.userMessageText : styles.assistantMessageText;
    const timestamp = message.created_at
      ? getLocalDate(new Date(message.created_at)).localDateString
      : '';
    const senderLabel = isUser ? 'You' : 'AI Assistant';
    const canRegenerate = !isUser && onRegenerate !== undefined;
    const canEdit = isUser && onEdit !== undefined;
    const canDelete = onDelete !== undefined;
    const canCopy = onCopy !== undefined;
    const hasToolCalls = Array.isArray(message.toolCalls) && message.toolCalls.length > 0;
    const hasReasoning = Boolean(message.reasoning && message.reasoning.trim().length > 0);
    const renderedToolCalls = message.toolCalls ?? [];
    const [isEditing, setIsEditing] = useState(false);
    const [draftMessage, setDraftMessage] = useState(content);

    // Assign lazily so StyleSheet objects are used (avoids per-render allocation)
    userMarkdownStyle.body = styles.userMessageText as unknown as Record<string, unknown>;
    botMarkdownStyle.body = styles.assistantMessageText as unknown as Record<string, unknown>;
    const markdownStyle = isUser ? userMarkdownStyle : botMarkdownStyle;

    return (
      <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
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
                  style={styles.actionButton}
                  onPress={() => {
                    setDraftMessage(content);
                    setIsEditing(false);
                  }}
                >
                  cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  style={styles.actionButton}
                  onPress={() => {
                    const trimmedContent = draftMessage.trim();
                    if (!trimmedContent) return;
                    onEdit?.(message.id, trimmedContent);
                    setIsEditing(false);
                  }}
                >
                  save
                </Button>
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
              {Markdown ? (
                <Markdown style={markdownStyle}>{content}</Markdown>
              ) : (
                <Text style={textStyle}>{content}</Text>
              )}
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

          <View style={[styles.metadata, isUser ? styles.metadataEnd : null]}>
            <Text variant="caption" color="text-secondary" style={styles.metadataText}>
              {senderLabel}
            </Text>
            {timestamp ? (
              <>
                <Text variant="caption" color="text-secondary">
                  {' · '}
                </Text>
                <Text variant="caption" color="text-secondary" style={styles.metadataText}>
                  {timestamp}
                </Text>
              </>
            ) : null}
          </View>

          <View style={[styles.actions, isUser ? styles.actionsEnd : null]}>
            <Button
              variant="ghost"
              size="xs"
              onPress={() => onCopy?.(message)}
              disabled={!canCopy}
              style={[styles.actionButton, !canCopy && styles.actionButtonDisabled]}
            >
              copy
            </Button>
            {canEdit ? (
              <Button
                variant="ghost"
                size="xs"
                onPress={() => {
                  setDraftMessage(content);
                  setIsEditing(true);
                }}
                style={styles.actionButton}
              >
                edit
              </Button>
            ) : null}
            {canRegenerate ? (
              <Button
                variant="ghost"
                size="xs"
                onPress={() => onRegenerate?.(message.id)}
                style={styles.actionButton}
              >
                regenerate
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="ghost"
                size="xs"
                onPress={() => onDelete?.(message.id)}
                style={styles.actionButton}
              >
                delete
              </Button>
            ) : null}
          </View>
        </View>
      </View>
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
  },
) => {
  return <ChatMessage message={item} Markdown={Markdown} {...actions} />;
};
