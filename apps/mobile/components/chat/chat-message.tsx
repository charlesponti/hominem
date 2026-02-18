import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Text, theme } from '~/theme'
import type { MessageOutput } from '~/utils/services/chat/use-chat-messages'

export type MarkdownComponent = React.ComponentType<{
  children: React.ReactNode
  style?: Record<string, unknown>
}>

export const loadMarkdown = async () => {
  const mod = await import('react-native-markdown-display')
  return mod.default as MarkdownComponent
}

const ChatMessage = ({
  message,
  Markdown,
}: {
  message: MessageOutput
  Markdown?: MarkdownComponent | null
}) => {
  const { role, message: content } = message
  const formattedRole = role.toLowerCase()
  const isUser = formattedRole === 'user'
  const chatBubbleStyle = isUser ? styles.userMessage : styles.botMessage

  return (
    <View style={[styles.bubble, chatBubbleStyle]}>
      {Markdown ? (
        <Markdown
          style={{
            body: isUser ? styles.userMessageText : styles.botMessageText,
          }}
        >
          {content}
        </Markdown>
      ) : (
        <Text style={isUser ? styles.userMessageText : styles.botMessageText}>{content}</Text>
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
}

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
    backgroundColor: theme.colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  userMessageText: {
    fontSize: 17,
    lineHeight: 24,
    color: '#e8ebf4',
  },
  botMessageText: {
    fontSize: 18,
    lineHeight: 24,
    color: '#f6f7fb',
  },
  focusItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  focusItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
})
