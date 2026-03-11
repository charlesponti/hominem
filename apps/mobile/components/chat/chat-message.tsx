import React, { memo, useState } from 'react'
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native'

import { Text, theme as appTheme } from '~/theme'
import type { MessageOutput } from '~/utils/services/chat'
import { getLocalDate } from '~/utils/dates'

type ToolCall = NonNullable<MessageOutput['toolCalls']>[number]

type ChatMessageProps = {
  message: MessageOutput
  Markdown?: React.ComponentType<{ children: React.ReactNode; style?: Record<string, unknown> }> | null
  onCopy?: (message: MessageOutput) => void
  onEdit?: (messageId: string, content: string) => void
  onRegenerate?: (messageId: string) => void
  onDelete?: (messageId: string) => void
}

export type MarkdownComponent = React.ComponentType<{
  children: React.ReactNode
  style?: Record<string, unknown>
}>

export const loadMarkdown = async () => {
  const mod = await import('react-native-markdown-display')
  return mod.default as MarkdownComponent
}

// Hoisted markdown style maps — stable references, no per-render allocation
const userMarkdownStyle = { body: {} as Record<string, unknown> }
const botMarkdownStyle = { body: {} as Record<string, unknown> }

const ChatMessage = memo(({
  message,
  Markdown,
  onCopy,
  onEdit,
  onRegenerate,
  onDelete,
}: ChatMessageProps) => {
  const { role, message: content } = message
  const isUser = role.toLowerCase() === 'user'
  const chatBubbleStyle = isUser ? styles.userMessage : styles.botMessage
  const textStyle = isUser ? styles.userMessageText : styles.botMessageText
  const timestamp = message.created_at ? getLocalDate(new Date(message.created_at)).localDateString : ''
  const senderLabel = isUser ? 'You' : 'AI Assistant'
  const canRegenerate = !isUser && onRegenerate !== undefined
  const canEdit = isUser && onEdit !== undefined
  const canDelete = onDelete !== undefined
  const canCopy = onCopy !== undefined
  const hasToolCalls = Array.isArray(message.toolCalls) && message.toolCalls.length > 0
  const hasReasoning = Boolean(message.reasoning && message.reasoning.trim().length > 0)
  const renderedToolCalls = message.toolCalls ?? []
  const [isEditing, setIsEditing] = useState(false)
  const [draftMessage, setDraftMessage] = useState(content)

  // Assign lazily so StyleSheet objects are used (avoids per-render allocation)
  userMarkdownStyle.body = styles.userMessageText as unknown as Record<string, unknown>
  botMarkdownStyle.body = styles.botMessageText as unknown as Record<string, unknown>
  const markdownStyle = isUser ? userMarkdownStyle : botMarkdownStyle

  return (
    <View style={[styles.bubble, chatBubbleStyle]}>
      <Modal visible={isEditing} transparent animationType="fade" onRequestClose={() => setIsEditing(false)}>
        <View style={styles.editBackdrop}>
          <View style={styles.editSheet}>
            <Text style={styles.editTitle}>Edit message</Text>
            <TextInput
              value={draftMessage}
              onChangeText={setDraftMessage}
              multiline
              style={styles.editInput}
              placeholder="Update your message"
              placeholderTextColor={appTheme.colors['text-tertiary']}
            />
            <View style={styles.editButtonRow}>
              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  setDraftMessage(content)
                  setIsEditing(false)
                }}
              >
                <Text style={styles.actionLabel}>cancel</Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  const trimmedContent = draftMessage.trim()
                  if (!trimmedContent) return
                  onEdit?.(message.id, trimmedContent)
                  setIsEditing(false)
                }}
              >
                <Text style={styles.actionLabel}>save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {Markdown ? (
        <Markdown style={markdownStyle}>
          {content}
        </Markdown>
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
        <Pressable
          onPress={() => onCopy?.(message)}
          accessibilityRole="button"
          disabled={!canCopy}
          style={[styles.actionButton, !canCopy && styles.actionButtonDisabled]}
        >
          <Text style={styles.actionLabel}>copy</Text>
        </Pressable>
        {canEdit ? (
          <Pressable
            onPress={() => {
              setDraftMessage(content)
              setIsEditing(true)
            }}
            accessibilityRole="button"
            style={styles.actionButton}
          >
            <Text style={styles.actionLabel}>edit</Text>
          </Pressable>
        ) : null}
        {canRegenerate ? (
          <Pressable
            onPress={() => onRegenerate?.(message.id)}
            accessibilityRole="button"
            style={styles.actionButton}
          >
            <Text style={styles.actionLabel}>regenerate</Text>
          </Pressable>
        ) : null}
        {canDelete ? (
          <Pressable
            onPress={() => onDelete?.(message.id)}
            accessibilityRole="button"
            style={styles.actionButton}
          >
            <Text style={styles.actionLabel}>delete</Text>
          </Pressable>
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
  )
})

ChatMessage.displayName = 'ChatMessage'

export const renderMessage = (
  item: MessageOutput,
  Markdown?: MarkdownComponent | null,
  actions?: {
    onCopy?: (message: MessageOutput) => void
    onEdit?: (messageId: string, content: string) => void
    onRegenerate?: (messageId: string) => void
    onDelete?: (messageId: string) => void
  },
) => {
  return <ChatMessage message={item} Markdown={Markdown} {...actions} />
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '90%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 6,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: appTheme.colors['bg-surface'],
    borderWidth: 1,
    borderColor: appTheme.colors['border-subtle'],
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: appTheme.colors['emphasis-lower'],
    borderWidth: 1,
    borderColor: appTheme.colors['emphasis-subtle'],
  },
  userMessageText: {
    fontSize: 17,
    lineHeight: 24,
    color: appTheme.colors.foreground,
  },
  botMessageText: {
    fontSize: 18,
    lineHeight: 24,
    color: appTheme.colors.foreground,
  },
  focusItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.spacing.sm_12,
    paddingHorizontal: appTheme.spacing.sm_12,
    paddingVertical: appTheme.spacing.s_8,
  },
  focusItem: {
    backgroundColor: appTheme.colors['border-default'],
    paddingHorizontal: appTheme.spacing.sm_12,
    paddingVertical: appTheme.spacing.s_8,
    borderRadius: appTheme.borderRadii.l_12,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    opacity: 0.7,
  },
  metadataText: {
    color: appTheme.colors['text-tertiary'],
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: appTheme.colors['border-default'],
  },
  actionButtonDisabled: {
    opacity: 0.35,
  },
  actionLabel: {
    color: appTheme.colors['text-secondary'],
    fontSize: 11,
    textTransform: 'uppercase',
  },
  reasoningText: {
    marginTop: 10,
    color: appTheme.colors.foreground,
    fontSize: 12,
    opacity: 0.8,
  },
  toolCalls: {
    marginTop: 8,
    gap: 6,
  },
  toolCall: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appTheme.colors['border-subtle'],
    backgroundColor: appTheme.colors.muted,
    padding: 10,
    gap: 4,
  },
  toolCallName: {
    color: appTheme.colors.foreground,
    fontSize: 12,
    fontWeight: '600',
  },
  toolCallArgs: {
    color: appTheme.colors['text-secondary'],
    fontSize: 11,
    fontFamily: appTheme.textVariants.mono.fontFamily,
  },
  editBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  editSheet: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: appTheme.colors.background,
    borderWidth: 1,
    borderColor: appTheme.colors['border-subtle'],
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  editTitle: {
    color: appTheme.colors.foreground,
    fontSize: 16,
    marginBottom: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: appTheme.colors['border-default'],
    borderRadius: 10,
    color: appTheme.colors.foreground,
    minHeight: 90,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: appTheme.colors.muted,
  },
  editButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
})
