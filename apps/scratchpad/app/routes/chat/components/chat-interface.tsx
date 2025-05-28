import type { ChatMessageSelect } from '@hominem/utils/types'
import { Eraser, NotebookPen, Send } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '~/components/ui/button.js'
import { ChatMessage } from './chat-message.js'

const MAX_MESSAGE_LENGTH = 10000

type ChatInterfaceProps = {
  messages: ChatMessageSelect[]
  onSendMessage: (message: string) => void
  // 'isSending' indicates an in-flight sendMessage operation
  isSending: boolean
  error: boolean
  onReset: () => void
  onNewChat?: () => void
  // Pagination props for loading older messages
  hasMore?: boolean
  isFetchingMore?: boolean
  fetchMore?: () => void
}

export function ChatInterface({
  messages,
  onSendMessage,
  isSending,
  error,
  onReset,
  onNewChat,
  hasMore = false,
  isFetchingMore = false,
  fetchMore,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLFormElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null) // Added ref for the main container

  // Memoized validation states
  const characterCount = inputValue.length
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH
  const trimmedValue = inputValue.trim()
  const canSubmit = trimmedValue && !isSending && !isOverLimit

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Auto-resize textarea immediately
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on:
      // - Enter (without Shift) - normal submission
      // - Cmd/Ctrl + Enter - force submission even with Shift
      const shouldSubmit =
        e.key === 'Enter' &&
        (!e.shiftKey || // Enter without Shift
          e.metaKey || // Cmd + Enter (macOS)
          e.ctrlKey) // Ctrl + Enter (Windows/Linux)

      if (shouldSubmit) {
        e.preventDefault()
        const trimmedValue = inputValue.trim()

        // Enhanced validation
        if (!trimmedValue) return
        if (trimmedValue.length > MAX_MESSAGE_LENGTH) {
          console.warn('Message too long (max 10,000 characters)')
          return
        }
        if (isSending) return

        onSendMessage(trimmedValue)
        setInputValue('')
        // Reset height after sending
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      }
    },
    [inputValue, isSending, onSendMessage]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmedValue = inputValue.trim()

      // Enhanced validation
      if (!trimmedValue) return
      if (trimmedValue.length > MAX_MESSAGE_LENGTH) {
        // Could show a toast notification here
        console.warn('Message too long (max 10,000 characters)')
        return
      }
      if (isSending) return

      onSendMessage(trimmedValue)
      setInputValue('')
      // Reset height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    },
    [inputValue, isSending, onSendMessage]
  )

  // Auto-focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // Handle mobile keyboard with a simpler approach
  useEffect(() => {
    const handleResize = () => {
      // On mobile, when keyboard appears, scroll messages to bottom
      if (window.innerHeight < 500 && messageListRef.current) {
        requestAnimationFrame(() => {
          if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight
          }
        })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Scroll to bottom when a new message is added
  useLayoutEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  })

  // Auto-fetch older messages when scrolled to top
  useEffect(() => {
    if (!fetchMore || !hasMore) return
    const container = messageListRef.current
    const sentinel = topSentinelRef.current
    if (!container || !sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingMore) {
          fetchMore()
        }
      },
      { root: container, threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchMore, hasMore, isFetchingMore])

  return (
    <div ref={chatContainerRef} className="fixed inset-0 flex flex-col touch-manipulation">
      {/* Messages container - takes remaining space above the form */}
      <div
        className="flex-1 overflow-y-auto overscroll-none [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:bg-primary/10 hover:[&::-webkit-scrollbar-thumb]:bg-primary/20"
        ref={messageListRef}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none',
          paddingBottom: '120px', // Space for fixed form
        }}
      >
        <div className="flex flex-col space-y-4 sm:space-y-6 px-2 sm:px-4 pt-4 w-full">
          <div className="w-full max-w-[850px] mx-auto space-y-6">
            {/* Sentinel for older messages auto-load */}
            <div ref={topSentinelRef} className="h-1" />
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isSending && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary" />
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-md border border-destructive/20">
                  <div className="font-medium">Failed to send message</div>
                  <div className="text-xs mt-1 opacity-75">
                    Please check your connection and try again
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form container - fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-sm border-t">
        <div className="mx-auto max-w-[850px] px-2 sm:px-4 py-2 sm:py-4 pb-safe">
          <form
            ref={bottomRef}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2 w-full bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg"
          >
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="w-full resize-none rounded-md px-3 py-2 text-sm sm:text-base focus-visible:outline-none bg-transparent min-h-[44px] max-h-[200px] touch-manipulation"
                style={{
                  height: 'auto',
                  WebkitAppearance: 'none',
                  fontSize: '16px', // Prevents zoom on iOS
                }}
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck="true"
              />
              {/* Character counter */}
              {characterCount > MAX_MESSAGE_LENGTH * 0.8 && (
                <div
                  className={`absolute bottom-1 right-2 text-xs ${
                    isOverLimit ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {characterCount}/{MAX_MESSAGE_LENGTH}
                </div>
              )}
            </div>
            <div className="flex gap-2 self-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  onReset()
                  setInputValue('')
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto'
                  }
                }}
                className="h-[38px] w-[38px] shrink-0"
              >
                <Eraser className="h-4 w-4" />
              </Button>
              {onNewChat && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onNewChat()
                    setInputValue('')
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto'
                    }
                  }}
                  className="h-[38px] w-[38px] shrink-0"
                >
                  <NotebookPen className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="submit"
                size="icon"
                disabled={!canSubmit}
                className="h-[38px] w-[38px] shrink-0"
                title={
                  isOverLimit
                    ? 'Message too long'
                    : !trimmedValue
                      ? 'Enter a message'
                      : isSending
                        ? 'Sending...'
                        : 'Send message'
                }
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
