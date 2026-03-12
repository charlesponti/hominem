import { fontSizes } from '@hominem/ui/tokens';
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
    bubble: {
      maxWidth: '90%',
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_12,
      borderRadius: t.borderRadii.xl_20,
      marginBottom: t.spacing.xs_4,
    },
    botMessage: {
      alignSelf: 'flex-start',
      backgroundColor: t.colors['bg-surface'],
      borderWidth: 1,
      borderColor: t.colors['border-subtle'],
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: t.colors['emphasis-lower'],
      borderWidth: 1,
      borderColor: t.colors['emphasis-subtle'],
    },
    userMessageText: {
      fontSize: 17,
      lineHeight: 24,
      color: t.colors.foreground,
    },
    botMessageText: {
      fontSize: 18,
      lineHeight: 24,
      color: t.colors.foreground,
    },
    focusItems: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.spacing.sm_12,
      paddingHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.sm_8,
    },
    focusItem: {
      backgroundColor: t.colors['border-default'],
      paddingHorizontal: t.spacing.sm_12,
      paddingVertical: t.spacing.sm_8,
      borderRadius: t.borderRadii.l_12,
    },
    metadata: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs_4,
      marginTop: t.spacing.sm_8,
      opacity: 0.7,
    },
    metadataText: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.xs,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm_8,
      marginTop: t.spacing.sm_8,
    },
    actionButton: {
      backgroundColor: t.colors['border-default'],
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
      marginTop: t.spacing.sm_12,
      color: t.colors.foreground,
      fontSize: fontSizes.xs,
      opacity: 0.8,
    },
    toolCalls: {
      marginTop: t.spacing.sm_8,
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
      fontFamily: t.textVariants.mono.fontFamily,
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
      marginBottom: t.spacing.xs_4,
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
  ({ message, Markdown, onCopy, onEdit, onRegenerate, onDelete }: ChatMessageProps) => {
    const styles = useStyles();
    const { role, message: content } = message;
    const isUser = role.toLowerCase() === 'user';
    const chatBubbleStyle = isUser ? styles.userMessage : styles.botMessage;
    const textStyle = isUser ? styles.userMessageText : styles.botMessageText;
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
    botMarkdownStyle.body = styles.botMessageText as unknown as Record<string, unknown>;
    const markdownStyle = isUser ? userMarkdownStyle : botMarkdownStyle;

    return (
      <View style={[styles.bubble, chatBubbleStyle]}>
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

        {Markdown ? (
          <Markdown style={markdownStyle}>{content}</Markdown>
        ) : (
          <Text style={textStyle}>{content}</Text>
        )}
        {hasReasoning && <Text style={styles.reasoningText}>{message.reasoning}</Text>}
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
        <View style={styles.actions}>
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
        {message.focus_items && message.focus_items.length > 0 ? (
          <View style={[styles.focusItems]}>
            {message.focus_items.map((focusItem) => (
              <View key={focusItem.id} style={[styles.focusItem]}>
                <Text variant="body" color="white">
                  {focusItem.text}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.metadata}>
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
      </View>
    );
  },
);

ChatMessage.displayName = 'ChatMessage';

export const renderMessage = (
  item: MessageOutput,
  Markdown?: MarkdownComponent | null,
  actions?: {
    onCopy?: (message: MessageOutput) => void;
    onEdit?: (messageId: string, content: string) => void;
    onRegenerate?: (messageId: string) => void;
    onDelete?: (messageId: string) => void;
  },
) => {
  return <ChatMessage message={item} Markdown={Markdown} {...actions} />;
};
