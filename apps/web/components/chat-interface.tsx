import type { ToolCalls, ToolResults } from '@/lib/hooks/use-chat'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@ponti/utils/schema'
import { Eraser, NotebookPen, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Message } from './ui/message'

type ChatInterfaceProps = {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading: boolean
  error: boolean
  onReset: () => void
  onNewChat?: () => void
  toolCalls?: ToolCalls
  toolResults?: ToolResults
  showDebugInfo?: boolean
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  error,
  onReset,
  onNewChat,
  toolCalls = [],
  toolResults = [],
  showDebugInfo = false,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue)
      setInputValue('')
      // Reset height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  // Auto-focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }

    adjustHeight()

    const resizeObserver = new ResizeObserver(adjustHeight)
    resizeObserver.observe(textarea)

    return () => {
      resizeObserver.disconnect()
    }
  }, []) // Remove inputValue dependency as we're using ResizeObserver

  // Scroll to bottom when messages update
  useEffect(() => {
    const element = messageListRef.current
    if (!element) return

    const scrollToBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = element
      const wasAtBottom = scrollTop + clientHeight >= scrollHeight - 10

      // Only animate if we were already at the bottom
      if (!wasAtBottom) return

      const targetScroll = element.scrollHeight - element.clientHeight
      const startScroll = element.scrollTop
      const startTime = performance.now()
      const duration = 300

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOut = (t: number) => 1 - (1 - t) ** 3
        element.scrollTop = startScroll + (targetScroll - startScroll) * easeOut(progress)
        if (progress < 1) requestAnimationFrame(animateScroll)
      }

      requestAnimationFrame(animateScroll)
    }

    // Use a MutationObserver to detect changes in the messages container
    const observer = new MutationObserver(scrollToBottom)
    observer.observe(element, { childList: true, subtree: true })

    // Initial scroll
    scrollToBottom()

    return () => observer.disconnect()
  }, []) // Empty dependency array since we're using MutationObserver

  return (
    <div className="relative flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" ref={messageListRef}>
        <div className="flex flex-col space-y-4 sm:space-y-6 p-2 sm:p-4 pb-[100px]">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}

          {showDebugInfo && toolCalls.length > 0 && (
            <Card
              className={cn(
                'p-3 sm:p-4 bg-muted/50 border-primary/10',
                'animate-in fade-in slide-in-from-bottom-2',
                isLoading && 'opacity-50'
              )}
            >
              <div className="font-semibold mb-2 text-primary text-sm">Tool Calls</div>
              <pre className="text-xs overflow-auto max-h-32 sm:max-h-40 bg-background/50 p-2 rounded-md">
                {JSON.stringify(toolCalls, null, 2)}
              </pre>
            </Card>
          )}

          {showDebugInfo && toolResults.length > 0 && (
            <Card
              className={cn(
                'p-3 sm:p-4 bg-muted/50 border-primary/10',
                'animate-in fade-in slide-in-from-bottom-2',
                isLoading && 'opacity-50'
              )}
            >
              <div className="font-semibold mb-2 text-primary text-sm">Tool Results</div>
              <pre className="text-xs overflow-auto max-h-32 sm:max-h-40 bg-background/50 p-2 rounded-md">
                {JSON.stringify(toolResults, null, 2)}
              </pre>
            </Card>
          )}

          {isLoading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary" />
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/80 to-transparent">
        <div className="mx-auto max-w-[400px] px-2 sm:px-4 pb-2 sm:pb-4">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2 w-full bg-background border rounded-lg p-2 shadow-lg"
          >
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="w-full resize-none rounded-md px-3 py-2 text-sm sm:text-base focus-visible:outline-none bg-transparent min-h-[44px] max-h-[200px]"
                style={{ height: 'auto' }}
              />
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
                disabled={!inputValue.trim() || isLoading}
                className="h-[38px] w-[38px] shrink-0"
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
