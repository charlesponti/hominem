import type { ChatMessageItem, ChatRenderIcon, MarkdownComponent } from '@hominem/chat';
import { getReferencedNoteLabel } from '@hominem/chat';
import { memo, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Reanimated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import {
  Text,
  fontFamiliesNative,
  fontSizes,
  makeStyles,
  radii,
  spacing,
  useThemeColors,
} from '~/components/theme';
import { IconButton } from '~/components/ui';
import { Button } from '~/components/ui/button';
import { ModalOverlay } from '~/components/ui/modal-overlay';
import t from '~/translations';

import { ChatThinkingIndicator } from './chat-thinking-indicator';

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
  formatTimestamp: (value: string) => string;
};

const ACTIONS_ENTERING = FadeInDown.duration(240).springify().damping(20).stiffness(220).mass(0.9);
const ACTIONS_EXITING = FadeOutUp.duration(180).springify().damping(24).stiffness(260).mass(0.8);
const ACTIONS_LAYOUT = LinearTransition.duration(200);

function ActionIconButton({
  disabled = false,
  icon,
  isDestructive = false,
  onPress,
}: {
  disabled?: boolean;
  icon: Parameters<typeof IconButton>[0]['icon'];
  isDestructive?: boolean;
  onPress: () => void;
}) {
  const themeColors = useThemeColors();

  return (
    <IconButton
      accessibilityLabel={icon}
      disabled={disabled}
      disabledOpacity={0.35}
      icon={icon}
      iconSize={16}
      onPress={onPress}
      pressedOpacity={0.65}
      tintColor={isDestructive ? themeColors.destructive : themeColors['text-secondary']}
    />
  );
}

export async function loadMarkdown() {
  const mod = await import('react-native-markdown-display');
  return mod.default as MarkdownComponent;
}

function MessageEditModal({
  visible,
  draftMessage,
  content,
  styles,
  onChangeDraft,
  onCancel,
  onSave,
}: {
  visible: boolean;
  draftMessage: string;
  content: string;
  styles: ReturnType<typeof useChatMessageStyles>;
  onChangeDraft: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const themeColors = useThemeColors();

  return (
    <ModalOverlay
      visible={visible}
      onClose={onCancel}
      dismissOnBackdropPress={false}
      position="center"
    >
      <View style={styles.editBackdropInset}>
        <View style={styles.editSheet}>
          <Text style={styles.editTitle}>{t.chat.messageEdit.title}</Text>
          <TextInput
            multiline
            value={draftMessage}
            onChangeText={onChangeDraft}
            placeholder={t.chat.messageEdit.placeholder}
            placeholderTextColor={themeColors['tertiary']}
            selectionColor={themeColors['text-primary']}
            cursorColor={themeColors['text-primary']}
            style={[
              styles.editInput,
              {
                backgroundColor: themeColors['card'],
                borderColor: themeColors['border-default'],
                color: themeColors['text-primary'],
              },
            ]}
          />
          <View style={styles.editActionsRow}>
            <View style={styles.editActionSlot}>
              <Button label={t.chat.messageEdit.cancel} onPress={onCancel} variant="secondary" />
            </View>
            <View style={styles.editActionSlot}>
              <Button
                label={t.chat.messageEdit.save}
                onPress={onSave}
                disabled={!draftMessage.trim() || draftMessage === content}
                variant="primary"
              />
            </View>
          </View>
        </View>
      </View>
    </ModalOverlay>
  );
}

function MessageToolCalls({
  toolCalls,
  styles,
}: {
  toolCalls: ToolCall[];
  styles: ReturnType<typeof useChatMessageStyles>;
}) {
  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <View style={styles.toolCalls}>
      {toolCalls.map((toolCall: ToolCall, index: number) => (
        <View key={toolCall.toolCallId || `tool-call-${index}`} style={styles.toolCall}>
          <Text style={styles.toolCallName}>{toolCall.toolName}</Text>
          <Text style={styles.toolCallArgs}>
            {toolCall.args ? JSON.stringify(toolCall.args, null, 2) : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ReferencedNotes({
  message,
  styles,
}: {
  message: ChatMessageItem;
  styles: ReturnType<typeof useChatMessageStyles>;
}) {
  if (!Array.isArray(message.referencedNotes) || message.referencedNotes.length === 0) {
    return null;
  }

  return (
    <View style={styles.referencedNotes}>
      {message.referencedNotes.map((note) => (
        <View key={note.id} style={styles.referencedNoteChip}>
          <Text style={styles.referencedNoteText}>{getReferencedNoteLabel(note)}</Text>
        </View>
      ))}
    </View>
  );
}

function MessageContent({
  content,
  Markdown,
  markdownStyle,
  textStyle,
  styles,
  children,
}: {
  content: string;
  isUser: boolean;
  Markdown?: MarkdownComponent | null;
  markdownStyle: object;
  textStyle: object;
  styles: ReturnType<typeof useChatMessageStyles>;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.transcriptBlock}>
      {Markdown ? (
        <Markdown style={markdownStyle}>{content}</Markdown>
      ) : (
        <Text style={textStyle}>{content}</Text>
      )}
      {children}
    </View>
  );
}

function MessageDebug({
  message,
  hasReasoning,
  styles,
}: {
  message: ChatMessageItem;
  hasReasoning: boolean;
  styles: ReturnType<typeof useChatMessageStyles>;
}) {
  return (
    <View style={styles.transcriptSurface}>
      <Text style={styles.reasoningText}>ID: {message.id}</Text>
      <Text style={styles.reasoningText}>Role: {message.role}</Text>
      <Text style={styles.reasoningText}>Created: {message.created_at || 'unknown'}</Text>
      <Text style={styles.reasoningText}>Reasoning: {hasReasoning ? 'present' : 'none'}</Text>
      <Text style={styles.reasoningText}>Tool calls: {message.toolCalls?.length ?? 0}</Text>
    </View>
  );
}

function FocusItems({
  message,
  styles,
}: {
  message: ChatMessageItem;
  styles: ReturnType<typeof useChatMessageStyles>;
}) {
  if (!message.focus_items?.length) {
    return null;
  }

  return (
    <View style={styles.focusItems}>
      {message.focus_items.map((focusItem) => (
        <View key={focusItem.id} style={styles.focusItem}>
          <Text>{focusItem.text}</Text>
        </View>
      ))}
    </View>
  );
}

function ActiveMessageActions({
  isActive,
  isUser,
  timestamp,
  message,
  isSpeaking,
  canCopy,
  canSpeak,
  canShare,
  canEdit,
  canRegenerate,
  canDelete,
  styles,
  onCopy,
  onSpeak,
  onShare,
  onEdit,
  onRegenerate,
  onDelete,
}: {
  isActive: boolean;
  isUser: boolean;
  timestamp: string;
  message: ChatMessageItem;
  isSpeaking: boolean;
  canCopy: boolean;
  canSpeak: boolean;
  canShare: boolean;
  canEdit: boolean;
  canRegenerate: boolean;
  canDelete: boolean;
  styles: ReturnType<typeof useChatMessageStyles>;
  onCopy?: (message: ChatMessageItem) => void;
  onSpeak?: (message: ChatMessageItem) => void;
  onShare?: (message: ChatMessageItem) => void;
  onEdit: () => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}) {
  if (!isActive) {
    return null;
  }

  return (
    <Reanimated.View
      entering={ACTIONS_ENTERING}
      exiting={ACTIONS_EXITING}
      layout={ACTIONS_LAYOUT}
      style={styles.actionsWrap}
    >
      <View style={[styles.actionsRow, isUser ? styles.actionsRowUser : null]}>
        {timestamp ? <Text style={styles.actionTimestamp}>{timestamp}</Text> : null}
        <ActionIconButton disabled={!canCopy} icon="doc.on.doc" onPress={() => onCopy?.(message)} />
        {canSpeak ? (
          <ActionIconButton
            icon={isSpeaking ? 'stop.fill' : 'speaker.wave.2'}
            onPress={() => onSpeak?.(message)}
          />
        ) : null}
        {canShare ? (
          <ActionIconButton icon="square.and.arrow.up" onPress={() => onShare?.(message)} />
        ) : null}
        {canEdit ? <ActionIconButton icon="square.and.pencil" onPress={onEdit} /> : null}
        {canRegenerate ? (
          <ActionIconButton icon="arrow.clockwise" onPress={() => onRegenerate?.(message.id)} />
        ) : null}
        {canDelete ? (
          <ActionIconButton icon="trash" isDestructive onPress={() => onDelete?.(message.id)} />
        ) : null}
      </View>
    </Reanimated.View>
  );
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
  formatTimestamp,
}: ChatMessageProps) {
  const styles = useChatMessageStyles();
  const { role, message: content, isStreaming } = message;
  const isUser = role.toLowerCase() === 'user';
  const textStyle = isUser ? styles.userMessageText : styles.assistantMessageText;
  const timestamp = message.created_at ? formatTimestamp(message.created_at) : '';
  const canRegenerate = !isUser && !isStreaming && onRegenerate !== undefined;
  const canEdit = isUser && !isStreaming && onEdit !== undefined;
  const canDelete = !isStreaming && onDelete !== undefined;
  const canCopy = !isStreaming && onCopy !== undefined;
  const canSpeak = !isUser && !isStreaming && onSpeak !== undefined && Boolean(content?.trim());
  const canShare = !isUser && !isStreaming && onShare !== undefined && Boolean(content?.trim());
  const hasReasoning = Boolean(message.reasoning && message.reasoning.trim().length > 0);
  const renderedToolCalls = message.toolCalls ?? [];
  const [isEditing, setIsEditing] = useState(false);
  const [draftMessage, setDraftMessage] = useState(content);
  const markdownStyle = useMemo(
    () => ({
      body: isUser ? styles.userMessageText : styles.assistantMessageText,
    }),
    [isUser, styles],
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

  // Streaming placeholder with no content yet — show thinking indicator inline
  if (isStreaming && !content) {
    return <ChatThinkingIndicator />;
  }

  return (
    <Pressable
      onPress={isStreaming ? undefined : onActivate}
      style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}
    >
      <MessageEditModal
        content={content}
        draftMessage={draftMessage}
        onCancel={closeEdit}
        onChangeDraft={setDraftMessage}
        onSave={saveEdit}
        styles={styles}
        visible={isEditing}
      />

      <View style={styles.contentColumn}>
        {!isUser && hasReasoning ? (
          <View style={styles.transcriptSurface}>
            <Text style={styles.reasoningText}>{message.reasoning}</Text>
          </View>
        ) : null}

        <MessageToolCalls styles={styles} toolCalls={renderedToolCalls} />

        <MessageContent
          Markdown={isStreaming ? null : Markdown}
          content={content}
          isUser={isUser}
          markdownStyle={markdownStyle}
          styles={styles}
          textStyle={textStyle}
        >
          {isUser ? <ReferencedNotes message={message} styles={styles} /> : null}
        </MessageContent>

        {showDebug && !isStreaming ? (
          <MessageDebug hasReasoning={hasReasoning} message={message} styles={styles} />
        ) : null}

        {!isStreaming ? <FocusItems message={message} styles={styles} /> : null}

        <ActiveMessageActions
          canCopy={canCopy}
          canDelete={canDelete}
          canEdit={canEdit}
          canRegenerate={canRegenerate}
          canShare={canShare}
          canSpeak={canSpeak}
          isActive={isActive}
          isUser={isUser}
          isSpeaking={isSpeaking}
          message={message}
          onCopy={onCopy}
          onDelete={onDelete}
          onEdit={() => {
            setDraftMessage(content);
            setIsEditing(true);
          }}
          onRegenerate={onRegenerate}
          onShare={onShare}
          onSpeak={onSpeak}
          styles={styles}
          timestamp={timestamp}
        />
      </View>
    </Pressable>
  );
});

export function renderChatMessage(
  item: ChatMessageItem,
  Markdown: MarkdownComponent | null | undefined,
  _renderIcon: ChatRenderIcon,
  formatTimestamp: (value: string) => string,
  actions?: {
    showDebug?: boolean;
    onCopy?: (message: ChatMessageItem) => void;
    onEdit?: (messageId: string, content: string) => void;
    onRegenerate?: (messageId: string) => void;
    onDelete?: (messageId: string) => void;
    onShare?: (message: ChatMessageItem) => void;
    isActive?: boolean;
    onActivate?: () => void;
  },
) {
  return (
    <ChatMessage
      Markdown={Markdown ?? null}
      formatTimestamp={formatTimestamp}
      message={item}
      {...actions}
    />
  );
}

const useChatMessageStyles = makeStyles((theme) => ({
  actionTimestamp: {
    color: theme.colors['tertiary'],
    fontSize: 12,
  },
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionsRowUser: {
    justifyContent: 'flex-end',
  },
  actionsWrap: {
    marginTop: spacing[1],
  },
  assistantMessageText: {
    color: theme.colors['text-primary'],
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.6,
  },
  contentColumn: {
    gap: spacing[2],
    width: '100%',
  },
  editBackdropInset: {
    paddingHorizontal: spacing[5],
    width: '100%',
  },
  editActionSlot: {
    flex: 1,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  editInput: {
    borderRadius: radii.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 90,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    textAlignVertical: 'top',
  },
  editSheet: {
    backgroundColor: theme.colors['background'],
    borderColor: theme.colors['border-default'],
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    width: '100%',
  },
  editTitle: {
    color: theme.colors['text-primary'],
    fontSize: 16,
  },
  focusItem: {
    backgroundColor: theme.colors['background'],
    borderColor: theme.colors['border-default'],
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  focusItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  reasoningText: {
    color: theme.colors['text-primary'],
    fontFamily: fontFamiliesNative.mono,
    fontSize: fontSizes.xs,
    opacity: 0.8,
  },
  referencedNoteChip: {
    alignItems: 'center',
    backgroundColor: theme.colors['popover'],
    borderColor: theme.colors['border-default'],
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  referencedNoteText: {
    color: theme.colors['text-secondary'],
    fontSize: fontSizes.xs,
  },
  referencedNotes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  row: {
    paddingVertical: spacing[2],
    width: '100%',
  },
  rowAssistant: {
    // open, no background
  },
  rowUser: {
    backgroundColor: theme.colors['popover'],
    borderCurve: 'continuous',
    borderRadius: radii.lg,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  toolCall: {
    backgroundColor: theme.colors['background'],
    borderColor: theme.colors['border-default'],
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[3],
  },
  toolCallArgs: {
    color: theme.colors['text-secondary'],
    fontFamily: fontFamiliesNative.mono,
    fontSize: fontSizes.xs,
  },
  toolCallName: {
    color: theme.colors['text-primary'],
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  toolCalls: {
    gap: spacing[1],
  },
  transcriptBlock: {
    gap: spacing[2],
    width: '100%',
  },
  transcriptSurface: {
    backgroundColor: theme.colors['background'],
    borderColor: theme.colors['border-default'],
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    width: '100%',
  },
  userMessageText: {
    color: theme.colors['text-primary'],
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
  },
}));
