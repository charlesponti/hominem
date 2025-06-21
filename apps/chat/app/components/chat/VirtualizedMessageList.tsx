import type { ChatMessageSelect } from '@hominem/utils/types'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChatMessage } from './chat-message.js'

type VirtualizedMessageListProps = {
  messages: ChatMessageSelect[]
  isSending: boolean
  error: boolean // For displaying error related to sending, within the list
  hasMore?: boolean
  isFetchingMore?: boolean
  fetchMore?: () => void
}

export function VirtualizedMessageList({
  messages,
  isSending,
  error,
  hasMore = false,
  isFetchingMore = false,
  fetchMore,
}: VirtualizedMessageListProps) {
  const messageListRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => messageListRef.current,
    estimateSize: useCallback(() => 100, []), // Estimate: average message height 100px. Will be adjusted later.
    overscan: 5,
  })

  // Effect to track if user is scrolled to the bottom AND to fetch more messages when near the top
  useEffect(() => {
    const listElement = messageListRef.current
    if (!listElement) return

    const handleScroll = () => {
      // Check for being at the bottom
      const bottomThreshold = 50 // Pixels from bottom to consider "at bottom"
      const atBottom =
        listElement.scrollHeight - listElement.scrollTop - listElement.clientHeight <
        bottomThreshold
      setIsAtBottom(atBottom)

      // Check for fetching more when near the top
      const topThreshold = 50 // Pixels from top to trigger fetchMore
      if (listElement.scrollTop < topThreshold && hasMore && !isFetchingMore && fetchMore) {
        fetchMore()
      }
    }

    listElement.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial check

    return () => listElement.removeEventListener('scroll', handleScroll)
  }, [hasMore, isFetchingMore, fetchMore])

  // Scroll to bottom when new messages are added, but only if the user was already at the bottom.
  useLayoutEffect(() => {
    if (isAtBottom && messages.length > 0) {
      rowVirtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior: 'smooth',
      })
    }
  }, [messages.length, isAtBottom, rowVirtualizer])

  // Handle mobile keyboard resize: scroll to bottom if at bottom
  useEffect(() => {
    const handleResize = () => {
      if (window.innerHeight < 500 && messageListRef.current && messages.length > 0) {
        const listElement = messageListRef.current
        const threshold = 100
        const nearBottom =
          listElement.scrollHeight - listElement.scrollTop - listElement.clientHeight < threshold

        if (isAtBottom || nearBottom) {
          requestAnimationFrame(() => {
            rowVirtualizer.scrollToIndex(messages.length - 1, {
              align: 'end',
              behavior: 'auto',
            })
          })
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isAtBottom, messages.length, rowVirtualizer])

  return (
    <div
      className="flex-1 overflow-y-auto overscroll-none [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:bg-primary/10 hover:[&::-webkit-scrollbar-thumb]:bg-primary/20"
      ref={messageListRef}
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'none',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const message = messages[virtualRow.index]
          if (!message) return null

          return (
            <div
              key={message.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="px-2 sm:px-4 w-full max-w-[850px] mx-auto box-border"
            >
              <ChatMessage message={message} />
            </div>
          )
        })}
      </div>

      {isSending && (
        <div className="sticky bottom-2 left-1/2 -translate-x-1/2 flex justify-center p-2 z-20">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary bg-background/50 backdrop-blur-sm p-2 shadow-lg" />
        </div>
      )}
      {error && !isSending && (
        <div className="sticky bottom-2 left-0 right-0 flex justify-center p-2 z-20">
          <div className="w-full max-w-[850px] mx-auto">
            <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-md border border-destructive/20 w-full text-center shadow-lg">
              <div className="font-medium">Failed to send message</div>
              <div className="text-xs mt-1 opacity-75">
                Please check your connection and try again.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
