import type { ChatMessageItem, ChatRenderIcon, MarkdownComponent } from '@hominem/chat';
import { getReferencedNoteLabel } from '@hominem/chat';
import { TextField } from '@ponti-studios/ui/native';
import type { SFSymbol } from 'expo-symbols';
import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Reanimated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { useAudioPlayback } from '~/components/media/useAudioPlayback';
import { IconButton } from '~/components/ui';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import { ModalOverlay } from '~/components/ui/modal-overlay';
import t from '~/translations';

import { ChatThinkingIndicator } from './chat-thinking-indicator';

type ToolCall = NonNullable<ChatMessageItem['toolCalls']>[number];

type ChatMessageProps = {
  message: ChatMessageItem;
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
  isDestructive: _isDestructive = false,
  onPress,
}: {
  disabled?: boolean;
  icon: SFSymbol;
  isDestructive?: boolean;
  onPress: () => void;
}) {
  return (
    <IconButton accessibilityLabel={icon} disabled={disabled} onPress={onPress}>
      <AppIcon name={icon} size={20} />
    </IconButton>
  );
}

async function loadMarkdown() {
  const mod = await import('react-native-markdown-display');
  return mod.default as MarkdownComponent;
}

let markdownPromise: Promise<MarkdownComponent | null> | null = null;

function getMarkdownComponent(): Promise<MarkdownComponent | null> {
  if (!markdownPromise) {
    markdownPromise = loadMarkdown().catch(() => null);
  }
  return markdownPromise;
}

function useMarkdownComponent(): MarkdownComponent | null {
  const [Markdown, setMarkdown] = useState<MarkdownComponent | null>(null);

  useEffect(() => {
    let active = true;
    void getMarkdownComponent().then((component) => {
      if (active) setMarkdown(component);
    });
    return () => {
      active = false;
    };
  }, []);

  return Markdown;
}

function MessageEditModal({
  visible,
  draftMessage,
  content,
  onChangeDraft,
  onCancel,
  onSave,
}: {
  visible: boolean;
  draftMessage: string;
  content: string;
  onChangeDraft: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [textPrimary, card, borderDefault] = useCSSVariable([
    '--color-foreground',
    '--color-card',
    '--color-border',
  ]) as string[];

  return (
    <ModalOverlay
      visible={visible}
      onClose={onCancel}
      dismissOnBackdropPress={false}
      position="center"
    >
      <View className="px-5 w-full">
        <View className="bg-background border border-border rounded-md gap-3 px-4 py-4 w-full">
          <Text style={{ color: textPrimary, fontSize: 16 }}>{t.chat.messageEdit.title}</Text>
          <TextField
            multiline
            value={draftMessage}
            onChangeText={onChangeDraft}
            placeholder={t.chat.messageEdit.placeholder}
            selectionColor={textPrimary}
            cursorColor={textPrimary}
            style={{
              borderRadius: 6,
              borderWidth: 1,
              fontSize: 16,
              minHeight: 90,
              paddingHorizontal: 12,
              paddingVertical: 8,
              textAlignVertical: 'top',
              backgroundColor: card,
              borderColor: borderDefault,
              color: textPrimary,
            }}
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button label={t.chat.messageEdit.cancel} onPress={onCancel} variant="secondary" />
            </View>
            <View className="flex-1">
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

function MessageToolCalls({ toolCalls }: { toolCalls: ToolCall[] }) {
  if (toolCalls.length === 0) {
    return null;
  }

  const [textPrimary] = useCSSVariable(['--color-foreground']) as string[];

  return (
    <View className="gap-1">
      {toolCalls.map((toolCall: ToolCall, index: number) => (
        <View
          key={toolCall.toolCallId || `tool-call-${index}`}
          className="bg-background border border-border rounded-md gap-1 p-3"
        >
          <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '600' }}>
            {toolCall.toolName}
          </Text>
          <Text className="text-mono text-muted-foreground">
            {toolCall.args ? JSON.stringify(toolCall.args, null, 2) : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ReferencedNotes({ message }: { message: ChatMessageItem }) {
  if (!Array.isArray(message.referencedNotes) || message.referencedNotes.length === 0) {
    return null;
  }

  const [textSecondary] = useCSSVariable(['--color-muted-foreground']) as string[];

  return (
    <View className="flex-row flex-wrap gap-2">
      {message.referencedNotes.map((note) => (
        <View
          key={note.id}
          className="items-center bg-popover border border-border rounded-sm flex-row gap-1 px-2 py-1"
        >
          <Text style={{ color: textSecondary, fontSize: 12 }}>{getReferencedNoteLabel(note)}</Text>
        </View>
      ))}
    </View>
  );
}

function MessageContent({
  content,
  enableMarkdown,
  textStyle,
  children,
}: {
  content: string;
  enableMarkdown: boolean;
  textStyle: object;
  children?: React.ReactNode;
}) {
  const Markdown = useMarkdownComponent();
  const [textPrimary, popover] = useCSSVariable([
    '--color-foreground',
    '--color-popover',
  ]) as string[];

  const markdownStyle = useMemo(
    () => ({
      body: textStyle,
      code_block: {
        backgroundColor: popover,
        borderRadius: 8,
        color: textPrimary,
        fontFamily: 'Menlo',
        padding: 12,
      },
      code_inline: {
        backgroundColor: popover,
        borderRadius: 4,
        color: textPrimary,
        fontFamily: 'Menlo',
        paddingHorizontal: 4,
      },
      fence: {
        backgroundColor: popover,
        borderRadius: 8,
        color: textPrimary,
        fontFamily: 'Menlo',
        padding: 12,
      },
    }),
    [textPrimary, popover, textStyle],
  );

  return (
    <View className="gap-2 w-full">
      {Markdown && enableMarkdown ? (
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
}: {
  message: ChatMessageItem;
  hasReasoning: boolean;
}) {
  return (
    <View className="bg-background border border-border rounded-md gap-1 px-3 py-3 w-full">
      <Text className="text-mono text-foreground opacity-80">ID: {message.id}</Text>
      <Text className="text-mono text-foreground opacity-80">Role: {message.role}</Text>
      <Text className="text-mono text-foreground opacity-80">
        Created: {message.created_at || 'unknown'}
      </Text>
      <Text className="text-mono text-foreground opacity-80">
        Reasoning: {hasReasoning ? 'present' : 'none'}
      </Text>
      <Text className="text-mono text-foreground opacity-80">
        Tool calls: {message.toolCalls?.length ?? 0}
      </Text>
    </View>
  );
}

function FocusItems({ message }: { message: ChatMessageItem }) {
  if (!message.focus_items?.length) {
    return null;
  }

  return (
    <View className="flex-row flex-wrap gap-3">
      {message.focus_items.map((focusItem) => (
        <View
          key={focusItem.id}
          className="bg-background border border-border rounded-md px-3 py-2"
        >
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

  const [tertiary] = useCSSVariable(['--color-tertiary']) as string[];

  return (
    <Reanimated.View
      entering={ACTIONS_ENTERING}
      exiting={ACTIONS_EXITING}
      layout={ACTIONS_LAYOUT}
      className="mt-1"
    >
      <View className={`items-center flex-row gap-2 ${isUser ? 'justify-end' : ''}`}>
        {timestamp ? <Text style={{ color: tertiary, fontSize: 12 }}>{timestamp}</Text> : null}
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
  const [textPrimary] = useCSSVariable(['--color-foreground']) as string[];

  const { role, message: content, isStreaming } = message;
  const isUser = role.toLowerCase() === 'user';
  const timestamp = message.created_at ? formatTimestamp(message.created_at) : '';
  const canRegenerate = !isUser && !isStreaming && onRegenerate !== undefined;
  const canEdit = isUser && !isStreaming && onEdit !== undefined;
  const canDelete = !isStreaming && onDelete !== undefined;
  const canCopy = !isStreaming && onCopy !== undefined;
  const audioUrl = message.audio?.url ?? null;
  const playback = useAudioPlayback(message.id, audioUrl);
  const effectiveIsSpeaking = onSpeak ? isSpeaking : playback.isSpeaking;
  const effectiveOnSpeak = onSpeak ?? (audioUrl ? playback.toggle : undefined);
  const canSpeak =
    !isUser && !isStreaming && effectiveOnSpeak !== undefined && Boolean(content?.trim());
  const canShare = !isUser && !isStreaming && onShare !== undefined && Boolean(content?.trim());
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
          canCopy={canCopy}
          canDelete={canDelete}
          canEdit={canEdit}
          canRegenerate={canRegenerate}
          canShare={canShare}
          canSpeak={canSpeak}
          isActive={isActive}
          isUser={isUser}
          isSpeaking={effectiveIsSpeaking}
          message={message}
          onCopy={onCopy}
          onDelete={onDelete}
          onEdit={() => {
            setDraftMessage(content);
            setIsEditing(true);
          }}
          onRegenerate={onRegenerate}
          onShare={onShare}
          onSpeak={effectiveOnSpeak}
          timestamp={timestamp}
        />
      </View>
    </Pressable>
  );
});

export function renderChatMessage(
  item: ChatMessageItem,
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
  return <ChatMessage formatTimestamp={formatTimestamp} message={item} {...actions} />;
}
