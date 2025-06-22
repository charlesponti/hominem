import type { Message } from 'ai'

// Component for text parts
function TextPart({ text, index }: { text: string; index: number }) {
  return (
    <div key={`text-${text.slice(0, 20)}-${index}`} className="whitespace-pre-wrap">
      {text}
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
function FallbackContent({ content }: { content: string }) {
  return <div className="whitespace-pre-wrap">{content}</div>
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`p-4 rounded-lg ${
        message.role === 'user' ? 'bg-primary text-primary-foreground ml-12' : 'bg-muted mr-12'
      }`}
    >
      <div className="text-sm opacity-70 mb-2">
        {message.role === 'user' ? 'You' : 'AI Assistant'}
      </div>

      {/* Message parts */}
      {message.parts && message.parts.length > 0 && (
        <div className="space-y-2">
          {message.parts.map((part, index) => {
            if (part.type === 'text') {
              return (
                <TextPart
                  key={`text-${part.text.slice(0, 20)}-${index}`}
                  text={part.text}
                  index={index}
                />
              )
            }

            if (part.type === 'tool-invocation') {
              return (
                <ToolInvocationPart
                  key={`tool-${part.toolInvocation.toolCallId}-${index}`}
                  toolInvocation={part.toolInvocation}
                  index={index}
                />
              )
            }

            if (part.type === 'reasoning') {
              return (
                <ReasoningPart
                  key={`reasoning-${part.reasoning.slice(0, 20)}-${index}`}
                  reasoning={part.reasoning}
                  index={index}
                />
              )
            }

            return null
          })}
        </div>
      )}

      {/* Fallback for simple content */}
      {message.content && (!message.parts || message.parts.length === 0) && (
        <FallbackContent content={message.content} />
      )}
    </div>
  )
}
