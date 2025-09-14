import { Bot } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { type RouterOutput, trpc } from '~/lib/trpc-client.js'
import { ChatMessage } from './ChatMessage.js'

type MessageFromQuery = RouterOutput['chats']['getMessages'][0]

// Extend the inferred message type with client-side properties
type ExtendedMessage = MessageFromQuery & {
  isStreaming?: boolean
}

interface ChatMessagesProps {
  chatId: string
  status?: string
  error?: Error | null
}

function SkeletonMessage() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    </div>
  )
}

// Enhanced thinking component with animated dots
function ThinkingComponent() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 bg-muted/50 rounded-lg p-4 border border-border/50">
        <div className="text-sm font-medium text-muted-foreground mb-2">AI Assistant</div>
        <div className="flex items-center gap-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
          </div>
          <span className="text-sm text-muted-foreground">Thinking...</span>
        </div>
      </div>
    </div>
  )
}

export function ChatMessages({ chatId, status = 'idle', error }: ChatMessagesProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)

  const {
    data: messages = [],
    isLoading,
    error: messagesError,
  } = trpc.chats.getMessages.useQuery(
    { chatId, limit: 50 },
    {
      enabled: !!chatId,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  )

  // Cast messages to extended type to handle optimistic updates
  const extendedMessages = messages as ExtendedMessage[]

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const currentMessageCount = extendedMessages.length
    const previousMessageCount = previousMessageCountRef.current

    // Only scroll if we have new messages or if we're streaming
    if (currentMessageCount > previousMessageCount || status === 'streaming') {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current
        const scrollToBottom = () => {
          container.scrollTop = container.scrollHeight
        }

        // Scroll immediately
        scrollToBottom()

        // Also scroll after a small delay to handle any dynamic content rendering
        const timeoutId = setTimeout(scrollToBottom, 100)

        return () => clearTimeout(timeoutId)
      }
    }

    // Update the ref with current count
    previousMessageCountRef.current = currentMessageCount
  }, [extendedMessages.length, status])

  // Auto-scroll during streaming with a more frequent interval
  useEffect(() => {
    if (status === 'streaming' && messagesContainerRef.current) {
      const container = messagesContainerRef.current
      const intervalId = setInterval(() => {
        container.scrollTop = container.scrollHeight
      }, 100) // Scroll every 100ms during streaming

      return () => clearInterval(intervalId)
    }
  }, [status])

  // Check if there's a streaming message (last message is assistant and streaming)
  const hasStreamingMessage =
    extendedMessages.length > 0 &&
    extendedMessages[extendedMessages.length - 1].role === 'assistant' &&
    (status === 'streaming' || extendedMessages[extendedMessages.length - 1].isStreaming)

  // Show thinking component only when submitted but no streaming message yet
  const showThinkingComponent =
    status === 'submitted' || (status === 'streaming' && !hasStreamingMessage)

  // Use the error from the hook if available, otherwise use the prop
  const displayError = messagesError || error

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Error Display */}
      {displayError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="text-sm font-medium text-destructive mb-1">Chat Error</div>
          <div className="text-xs text-destructive/80">{displayError.message}</div>
        </div>
      )}

      {/* Loading state when fetching messages */}
      {isLoading && extendedMessages.length === 0 && (
        <div className="space-y-4">
          <SkeletonMessage />
          <SkeletonMessage />
          <SkeletonMessage />
        </div>
      )}

      {/* Messages */}
      {extendedMessages.map((message, index) => (
        <ChatMessage
          key={message.id}
          message={message}
          isStreaming={
            (status === 'streaming' &&
              index === extendedMessages.length - 1 &&
              message.role === 'assistant') ||
            message.isStreaming
          }
        />
      ))}

      {/* Enhanced thinking component */}
      {showThinkingComponent && <ThinkingComponent />}
    </div>
  )
}
