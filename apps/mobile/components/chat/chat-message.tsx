import React, { memo } from 'react'
import { StyleSheet, View } from 'react-native'

import { Text, theme as appTheme } from '~/theme'
import type { MessageOutput } from '~/utils/services/chat'

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
}: {
  message: MessageOutput
  Markdown?: MarkdownComponent | null
}) => {
  const { role, message: content } = message
  const isUser = role.toLowerCase() === 'user'
  const chatBubbleStyle = isUser ? styles.userMessage : styles.botMessage
  const textStyle = isUser ? styles.userMessageText : styles.botMessageText

  // Assign lazily so StyleSheet objects are used (avoids per-render allocation)
  userMarkdownStyle.body = styles.userMessageText as unknown as Record<string, unknown>
  botMarkdownStyle.body = styles.botMessageText as unknown as Record<string, unknown>
  const markdownStyle = isUser ? userMarkdownStyle : botMarkdownStyle

  return (
    <View style={[styles.bubble, chatBubbleStyle]}>
      {Markdown ? (
        <Markdown style={markdownStyle}>
          {content}
        </Markdown>
      ) : (
        <Text style={textStyle}>{content}</Text>
      )}
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
    </View>
  )
})

ChatMessage.displayName = 'ChatMessage'

export const renderMessage = (
  item: MessageOutput,
  Markdown?: MarkdownComponent | null
) => {
  return <ChatMessage message={item} Markdown={Markdown} />
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
    backgroundColor: appTheme.colors.darkCard,
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
})
