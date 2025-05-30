'use client'

import { useCallback, useRef } from 'react'
import { ChatInterface } from './components/chat-interface.js'
import { CHAT_ENDPOINTS, useChat } from './lib/use-chat.js'

export default function ChatPage() {
  const lastSubmissionTime = useRef<number>(0)
  const {
    messages,
    isLoadingHistory,
    hasMore,
    isFetchingMore,
    fetchMore,
    isSending,
    error,
    sendMessage,
    resetConversation,
    startNewChat,
  } = useChat({
    endpoint: CHAT_ENDPOINTS.CHAT,
    initialMessages: [],
  })

  // Memoized handlers to prevent unnecessary re-renders with debouncing
  const handleSendMessage = useCallback(
    (content: string) => {
      // Debounce rapid submissions (prevent double-clicks/submissions)
      const now = Date.now()
      if (now - lastSubmissionTime.current < 1000) {
        return // Ignore submissions within 1 second of the last one
      }
      lastSubmissionTime.current = now

      sendMessage.mutate(content)
    },
    [sendMessage]
  )

  const handleReset = useCallback(() => {
    resetConversation.mutate()
  }, [resetConversation])

  const handleNewChat = useCallback(() => {
    startNewChat.mutate()
  }, [startNewChat])

  // Show spinner while loading initial chat history
  if (isLoadingHistory) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="relative">
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        error={!!error}
        onReset={handleReset}
        onNewChat={handleNewChat}
        hasMore={hasMore}
        isFetchingMore={isFetchingMore}
        fetchMore={fetchMore}
      />
    </div>
  )
}
