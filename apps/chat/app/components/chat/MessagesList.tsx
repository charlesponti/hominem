import { useEffect, useRef } from 'react'
import { Button } from '~/components/ui/button.js'
import { AudioPlayer } from './AudioPlayer.js'
import type { MessagesListProps } from './types.js'

export function MessagesList({
  messages,
  currentStreamingMessage,
  error,
  onRetry,
}: MessagesListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  })

  return (
    <div className="flex-1 overflow-auto p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              {/* Message content */}
              <div className="prose prose-sm max-w-none">
                {message.content}
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                )}
              </div>

              {/* Audio player for TTS responses */}
              {message.audioUrl && (
                <div className="mt-3">
                  <AudioPlayer
                    src={message.audioUrl}
                    title="AI Response Audio"
                    autoPlay={false}
                    showDownload={true}
                  />
                </div>
              )}

              {/* File attachments */}
              {message.files && message.files.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs opacity-70">Attachments:</div>
                  {message.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 text-xs bg-black/10 rounded p-2"
                    >
                      <span className="truncate">{file.originalName}</span>
                      <span className="text-xs opacity-50">({file.type})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs opacity-50 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Error message */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 max-w-md text-center">
              <p className="text-sm">{error}</p>
              <Button variant="ghost" size="sm" onClick={onRetry} className="mt-2">
                Retry
              </Button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
