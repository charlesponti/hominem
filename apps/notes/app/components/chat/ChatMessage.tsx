import type { RouterOutput } from '~/lib/trpc.js'
import { cn } from '~/lib/utils'

// Get the inferred type from the tRPC query using RouterOutput
type MessageFromQuery = RouterOutput['chats']['getMessages'][0]

// Extend the inferred message type with client-side properties
type ExtendedMessage = MessageFromQuery & {
  isStreaming?: boolean
}

// Component for text parts
function _TextPart({
  text,
  index,
  isStreaming,
}: {
  text: string
  index: number
  isStreaming?: boolean
}) {
  return (
    <div key={`text-${text.slice(0, 20)}-${index}`} className="whitespace-pre-wrap">
      {text}
      {isStreaming && <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-1" />}
    </div>
  )
}

// Component for tool invocation parts
function _ToolInvocationPart({
  toolInvocation,
  index,
}: {
  toolInvocation: {
    toolName: string
    toolCallId: string
    state: string
    args?: unknown
    result?: unknown
  }
  index: number
}) {
  const { toolName, toolCallId, state } = toolInvocation

  if (state === 'call') {
    return (
      <div key={toolCallId} className="bg-background/50 p-3 rounded border">
        <div className="font-medium text-sm flex items-center gap-2">🔧 Calling {toolName}...</div>
        <div className="text-xs opacity-70 mt-1">
          {JSON.stringify(toolInvocation.args, null, 2)}
        </div>
      </div>
    )
  }

  if (state === 'result') {
    return (
      <div key={toolCallId} className="bg-background/50 p-3 rounded border">
        <div className="font-medium text-sm flex items-center gap-2">✅ {toolName} result:</div>
        <pre className="text-xs opacity-70 mt-1 whitespace-pre-wrap">
          {JSON.stringify(toolInvocation.result, null, 2)}
        </pre>
      </div>
    )
  }

  return null
}

// Component for reasoning parts
function _ReasoningPart({ reasoning, index }: { reasoning: string; index: number }) {
  return (
    <div
      key={`reasoning-${reasoning.slice(0, 20)}-${index}`}
      className="bg-muted/50 p-3 rounded border"
    >
      <div className="font-medium text-sm flex items-center gap-2">🤔 Reasoning:</div>
      <div className="text-xs opacity-70 mt-1 whitespace-pre-wrap">{reasoning}</div>
    </div>
  )
}

// Component for fallback content
function FallbackContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <div className="whitespace-pre-wrap">
      {content}
      {isStreaming && <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-1" />}
    </div>
  )
}

interface ChatMessageProps {
  message: ExtendedMessage
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user'
  return (
    <div
      className={cn('p-4 rounded-lg flex flex-col gap-2', {
        'bg-primary text-primary-foreground ml-12': isUser,
        'bg-muted mr-12': !isUser,
      })}
    >
      <FallbackContent content={message.content} isStreaming={isStreaming} />
      <div
        className={cn('flex text-xs opacity-70', {
          'justify-end': isUser,
          'justify-start': !isUser,
        })}
      >
        {isUser ? 'You' : 'AI Assistant'}
      </div>
    </div>
  )
}
