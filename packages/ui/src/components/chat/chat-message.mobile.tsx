import { memo, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import {
  chatTokensNative,
  colors,
  fontFamiliesNative,
  fontSizes,
  radiiNative,
  spacing,
} from '../../tokens';
import { Text } from '../typography/text.native';
import { Button } from '../ui/button.native';
import { TextArea } from '../ui/text-area.native';
import type { ChatMessageItem, ChatRenderIcon, MarkdownComponent } from './chat.types';

type ToolCall = NonNullable<ChatMessageItem['toolCalls']>[number];

type ChatMessageProps = {
  message: ChatMessageItem;
  Markdown?: MarkdownComponent | null;
  showDebug?: boolean;
  onCopy?: (message: ChatMessageItem) => void;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSpeak?: (message: ChatMessageItem) => void;
  isSpeaking?: boolean;
  onShare?: (message: ChatMessageItem) => void;
  isActive?: boolean;
  onActivate?: () => void;
  renderIcon: ChatRenderIcon;
  formatTimestamp: (value: string) => string;
};

const ACTIONS_ENTERING = FadeInDown.duration(240).springify().damping(20).stiffness(220).mass(0.9);
const ACTIONS_EXITING = FadeOutUp.duration(180).springify().damping(24).stiffness(260).mass(0.8);
const ACTIONS_LAYOUT = LinearTransition.duration(200);

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: radiiNative.full,
    height: 32,
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: 32,
  },
  actionButtonDisabled: {
    opacity: 0.3,
  },
  actionIcon: {
    opacity: 0.9,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: spacing[2],
    justifyContent: 'flex-end',
  },
  actionsWrap: {
    marginTop: spacing[1],
  },
  assistantMessageText: {
    color: colors.foreground,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.55,
  },
  assistantSurface: {
    backgroundColor: colors['bg-base'],
    borderColor: colors['border-subtle'],
    borderRadius: radiiNative.md,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    maxWidth: chatTokensNative.userBubbleMaxWidth,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    width: '100%',
  },
  contentColumn: {
    gap: spacing[2],
    width: '100%',
  },
  contentColumnUser: {
    alignItems: 'flex-end',
  },
  editBackdrop: {
    alignItems: 'center',
    backgroundColor: colors['overlay-modal-medium'],
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: spacing[5],
    position: 'absolute',
    right: 0,
    top: 0,
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'flex-end',
  },
  editInput: {
    minHeight: 90,
  },
  editSheet: {
    backgroundColor: colors['bg-base'],
    borderColor: colors['border-subtle'],
    borderRadius: radiiNative.md,
    borderWidth: 1,
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    width: '100%',
  },
  editTitle: {
    color: colors.foreground,
    fontSize: 16,
  },
  focusItem: {
    backgroundColor: colors['bg-base'],
    borderColor: colors['border-default'],
    borderRadius: radiiNative.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  focusItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  metadataText: {
    color: colors['text-tertiary'],
    fontFamily: fontFamiliesNative.mono,
    fontSize: fontSizes.xs,
  },
  reasoningText: {
    color: colors.foreground,
    fontFamily: fontFamiliesNative.mono,
    fontSize: fontSizes.xs,
    opacity: 0.8,
  },
  row: {
    paddingVertical: spacing[2],
    width: '100%',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  toolCall: {
    backgroundColor: colors['bg-base'],
    borderColor: colors['border-subtle'],
    borderRadius: radiiNative.md,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  toolCallArgs: {
    color: colors['text-secondary'],
    fontFamily: fontFamiliesNative.mono,
    fontSize: fontSizes.xs,
  },
  toolCallName: {
    color: colors.foreground,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  toolCalls: {
    gap: spacing[1],
  },
  transcriptBlock: {
    gap: spacing[3],
    width: '100%',
  },
  transcriptSurface: {
    backgroundColor: colors['bg-base'],
    borderColor: colors['border-default'],
    borderRadius: radiiNative.md,
    borderWidth: 1,
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    width: '100%',
  },
  userMessageText: {
    color: colors.white,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
  },
  userSurface: {
    backgroundColor: colors['emphasis-highest'],
    borderColor: colors['emphasis-highest'],
    borderRadius: radiiNative.md,
    borderWidth: 1,
    maxWidth: chatTokensNative.userBubbleMaxWidth,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    width: '100%',
  },
});

export async function loadMarkdown() {
  const mod = await import('react-native-markdown-display');
  return mod.default as MarkdownComponent;
}

const ChatMessage = memo(function ChatMessage({
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
  renderIcon,
  formatTimestamp,
}: ChatMessageProps) {
  const { role, message: content } = message;
  const isUser = role.toLowerCase() === 'user';
  const textStyle = isUser ? styles.userMessageText : styles.assistantMessageText;
  const timestamp = message.created_at ? formatTimestamp(message.created_at) : '';
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
      body: isUser ? styles.userMessageText : styles.assistantMessageText,
    }),
    [isUser],
  );

  return (
    <Pressable
      onPress={onActivate}
      style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}
    >
      <Modal
        animationType="fade"
        onRequestClose={() => setIsEditing(false)}
        transparent
        visible={isEditing}
      >
        <View style={styles.editBackdrop}>
          <View style={styles.editSheet}>
            <Text style={styles.editTitle}>Edit message</Text>
            <TextArea
              label="Edit message"
              placeholder="Update your message"
              style={styles.editInput}
              value={draftMessage}
              onChangeText={setDraftMessage}
            />
            <View style={styles.editButtonRow}>
              <Button
                onPress={() => {
                  setDraftMessage(content);
                  setIsEditing(false);
                }}
                size="sm"
                style={styles.actionButton}
                title="cancel"
                variant="outline"
              />
              <Button
                onPress={() => {
                  const trimmedContent = draftMessage.trim();
                  if (!trimmedContent) return;
                  onEdit?.(message.id, trimmedContent);
                  setIsEditing(false);
                }}
                size="sm"
                style={styles.actionButton}
                title="save"
                variant="primary"
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

        {hasToolCalls ? (
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
        ) : null}

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
            <Text style={styles.reasoningText}>Created: {message.created_at || 'unknown'}</Text>
            <Text style={styles.reasoningText}>Reasoning: {hasReasoning ? 'present' : 'none'}</Text>
            <Text style={styles.reasoningText}>Tool calls: {message.toolCalls?.length ?? 0}</Text>
          </View>
        ) : null}

        {message.focus_items && message.focus_items.length > 0 ? (
          <View style={styles.focusItems}>
            {message.focus_items.map((focusItem) => (
              <View key={focusItem.id} style={styles.focusItem}>
                <Text>{focusItem.text}</Text>
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
                <Text color="text-secondary" style={styles.metadataText}>
                  {timestamp}
                </Text>
              ) : null}
              <Button
                accessibilityLabel="Copy message"
                disabled={!canCopy}
                onPress={() => onCopy?.(message)}
                size="icon-xs"
                style={[styles.actionButton, !canCopy ? styles.actionButtonDisabled : null]}
                variant="ghost"
              >
                {renderIcon('copy', {
                  color: colors['text-tertiary'],
                  size: 15,
                  style: styles.actionIcon,
                  useSymbol: true,
                })}
              </Button>
              {canSpeak ? (
                <Button
                  accessibilityLabel={isSpeaking ? 'Stop reading' : 'Read aloud'}
                  onPress={() => onSpeak?.(message)}
                  size="icon-xs"
                  style={styles.actionButton}
                  variant="ghost"
                >
                  {renderIcon(isSpeaking ? 'stop' : 'speaker', {
                    color: colors['text-tertiary'],
                    size: 15,
                    style: styles.actionIcon,
                    useSymbol: true,
                  })}
                </Button>
              ) : null}
              {canShare ? (
                <Button
                  accessibilityLabel="Share message"
                  onPress={() => onShare?.(message)}
                  size="icon-xs"
                  style={styles.actionButton}
                  variant="ghost"
                >
                  {renderIcon('share-from-square', {
                    color: colors['text-tertiary'],
                    size: 15,
                    style: styles.actionIcon,
                    useSymbol: true,
                  })}
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  accessibilityLabel="Edit message"
                  onPress={() => {
                    setDraftMessage(content);
                    setIsEditing(true);
                  }}
                  size="icon-xs"
                  style={styles.actionButton}
                  variant="ghost"
                >
                  {renderIcon('pen-to-square', {
                    color: colors['text-tertiary'],
                    size: 15,
                    style: styles.actionIcon,
                    useSymbol: true,
                  })}
                </Button>
              ) : null}
              {canRegenerate ? (
                <Button
                  accessibilityLabel="Regenerate response"
                  onPress={() => onRegenerate?.(message.id)}
                  size="icon-xs"
                  style={styles.actionButton}
                  variant="ghost"
                >
                  {renderIcon('arrows-rotate', {
                    color: colors['text-tertiary'],
                    size: 15,
                    style: styles.actionIcon,
                    useSymbol: true,
                  })}
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  accessibilityLabel="Delete message"
                  onPress={() => onDelete?.(message.id)}
                  size="icon-xs"
                  style={styles.actionButton}
                  variant="ghost"
                >
                  {renderIcon('trash', {
                    color: colors['text-tertiary'],
                    size: 15,
                    style: styles.actionIcon,
                    useSymbol: true,
                  })}
                </Button>
              ) : null}
            </View>
          </Reanimated.View>
        ) : null}
      </View>
    </Pressable>
  );
});

export function renderChatMessage(
  item: ChatMessageItem,
  Markdown: MarkdownComponent | null | undefined,
  renderIcon: ChatRenderIcon,
  formatTimestamp: (value: string) => string,
  actions?: {
    showDebug?: boolean;
    onCopy?: (message: ChatMessageItem) => void;
    onEdit?: (messageId: string, content: string) => void;
    onRegenerate?: (messageId: string) => void;
    onDelete?: (messageId: string) => void;
    onSpeak?: (message: ChatMessageItem) => void;
    speakingId?: string | null;
    onShare?: (message: ChatMessageItem) => void;
    isActive?: boolean;
    onActivate?: () => void;
  },
) {
  const { speakingId, ...rest } = actions ?? {};
  return (
    <ChatMessage
      Markdown={Markdown ?? null}
      formatTimestamp={formatTimestamp}
      isSpeaking={speakingId === item.id}
      message={item}
      renderIcon={renderIcon}
      {...rest}
    />
  );
}

export { ChatMessage };
