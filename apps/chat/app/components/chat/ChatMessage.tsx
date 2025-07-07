import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../../../packages/types/trpc'

type Message = inferRouterOutputs<AppRouter>['chats']['getUserChats'][number]

// Component for text parts
function TextPart({
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
function ToolInvocationPart({
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
function ReasoningPart({ reasoning, index }: { reasoning: string; index: number }) {
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
  message: Message
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  return (
    <div
      className={`p-4 rounded-lg ${
        message.role === 'user' ? 'bg-primary text-primary-foreground ml-12' : 'bg-muted mr-12'
      }`}
    >
      <div className="text-sm opacity-70 mb-2">
        {message.role === 'user' ? 'You' : 'AI Assistant'}
      </div>

      {/* Simple content display - our tRPC type has a simpler structure */}
      <FallbackContent content={message.content} isStreaming={isStreaming} />
    </div>
  )
}
