import type { Message, ToolCalls, ToolResults } from '@/lib/hooks/use-chat'
import { Eraser, NotebookPen, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Message as MessageComponent } from './ui/message'
import { Textarea } from './ui/textarea'

type ChatInterfaceProps = {
  messages: Message[]
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

  const messageListRef = useRef<HTMLDivElement>(null)

  // Auto-focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }

    adjustHeight()

    return () => {
      // Clean up if needed
    }
  }, [inputValue])

  // biome-ignore lint/correctness/useExhaustiveDependencies: This effect should run when messages change.
  useEffect(() => {
    const scrollToBottom = (element: HTMLElement) => {
      if (messageListRef.current) {
        // const element = messageListRef.current
        const targetScroll = element.scrollHeight - element.clientHeight
        const startScroll = element.scrollTop
        const duration = 300 // animation duration in ms
        const startTime = performance.now()

        const animateScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime
          const progress = Math.min(elapsed / duration, 1)

          // Easing function for smooth animation
          const easeOut = (t: number) => 1 - (1 - t) ** 3

          element.scrollTop = startScroll + (targetScroll - startScroll) * easeOut(progress)

          if (progress < 1) {
            requestAnimationFrame(animateScroll)
          }
        }

        requestAnimationFrame(animateScroll)
      }
    }
    scrollToBottom(messageListRef.current as HTMLElement)
  }, [messageListRef, messages])

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden">
      <div
        className="flex-1 flex flex-col justify-start overflow-y-auto p-4 pb-28 space-y-4"
        ref={messageListRef}
      >
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Send a message to start the conversation
          </div>
        ) : (
          messages.map((message) => (
            <MessageComponent
              key={message.id}
              id={message.id}
              role={message.role}
              content={message.content}
            />
          ))
        )}

        {error && (
          <Card className="p-4 bg-destructive/10 text-destructive">
            <div className="font-semibold mb-1">Error</div>
            <div>We encountered an issue. Please try again later.</div>
          </Card>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse text-sm text-primary">Thinking...</div>
          </div>
        )}

        {showDebugInfo && toolCalls.length > 0 && (
          <Card className="p-4 bg-muted/80">
            <div className="font-semibold mb-1">Tool Calls</div>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(toolCalls, null, 2)}
            </pre>
          </Card>
        )}

        {showDebugInfo && toolResults.length > 0 && (
          <Card className="p-4 bg-muted/80">
            <div className="font-semibold mb-1">Tool Results</div>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(toolResults, null, 2)}
            </pre>
          </Card>
        )}
      </div>

      <div className="absolute bottom-0 w-full flex justify-center bg-gradient-to-t from-background to-transparent pt-6">
        <div className="w-full max-w-[700px] p-4">
          <form onSubmit={handleSubmit} className="flex items-end gap-2 relative">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="resize-none min-h-[40px] max-h-[200px] py-3 pr-12 rounded-full border shadow-sm focus-visible:ring-offset-0"
                disabled={isLoading}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <Button
                className="absolute right-2 bottom-1 h-8 w-8 p-0 rounded-full"
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                size="icon"
              >
                <Send size={16} />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onNewChat || onReset}
              className="rounded-full h-10 w-10 p-0 flex items-center justify-center"
              size="icon"
            >
              {onNewChat ? <NotebookPen size={16} /> : <Eraser size={16} />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
