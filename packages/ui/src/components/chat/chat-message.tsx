import type { ChatMessageToolCall } from '@hominem/rpc/types/chat.types'
import { formatMessageTimestamp } from '@hominem/utils/dates'
import {
  AlertCircle,
  Check,
  Copy,
  Edit2,
  MoreVertical,
  RotateCcw,
  Save,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { memo, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'

import { playEnterRow, reducedMotion } from '../../lib/gsap/sequences'
import { cn, copyToClipboard } from '../../lib/utils'
import { useMessageEdit } from '../../lib/hooks/use-message-edit'
import type { ExtendedMessage } from '../../types/chat'
import { Button } from '../ui/button'
import { Form } from '../ui/form'
import { Inline, Stack } from '../layout'
import {
  MarkdownContent,
  Message,
  MessageAnnotations,
  MessageContent,
  Reasoning,
  Tool,
  ToolInput,
} from '../ai-elements'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Textarea } from '../ui/textarea'
import { chatTokens } from '../../tokens'

interface ChatMessageProps {
  message: ExtendedMessage
  showDebug?: boolean
  isStreaming?: boolean
  speakingId?: string | null
  onRegenerate?: (() => void) | undefined
  onEdit?: ((messageId: string, newContent: string) => void) | undefined
  onDelete?: (() => void) | undefined
  onSpeak?: ((messageId: string, content: string) => void) | undefined
}

export const ChatMessage = memo(function ChatMessage({
  message,
  showDebug = false,
  isStreaming = false,
  speakingId,
  onRegenerate,
  onEdit,
  onDelete,
  onSpeak,
}: ChatMessageProps) {
  const isUser = message.role === 'user'
  const hasContent = Boolean(message.content && message.content.trim().length > 0)
  const hasToolCalls = Boolean(message.toolCalls && Array.isArray(message.toolCalls) && message.toolCalls.length > 0)
  const hasReasoning = Boolean(message.reasoning && message.reasoning.trim().length > 0)
  const isErrorMessage = !isUser && message.content?.startsWith('[Error:')
  const [copied, setCopied] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!rowRef.current) return
    if (reducedMotion()) return
    playEnterRow(rowRef.current, 0)
  }, [])

  const handleCopyMessage = async () => {
    const success = await copyToClipboard(message.content || '')
    if (success) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareMessage = async () => {
    const text = message.content
    if (!text) return
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text }).catch(() => null)
    } else {
      const success = await copyToClipboard(text)
      if (success) {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  const isSpeaking = speakingId === message.id

  const { isEditing, editContent, setEditContent, startEdit, cancelEdit, saveEdit, canSave } =
    useMessageEdit({
      initialContent: message.content || '',
      ...(onEdit && { onSave: (newContent) => onEdit(message.id, newContent) }),
    })

  const timestamp = message.createdAt ? formatMessageTimestamp(message.createdAt) : ''

  return (
    <div
      ref={rowRef}
      className="group"
      style={{ paddingTop: 'var(--spacing-2)', paddingBottom: 'var(--spacing-2)' }}
      role="article"
      aria-label={`${isUser ? 'Your' : 'Message'}${timestamp ? ` from ${timestamp}` : ''}`}
    >
      <Message from={isUser ? 'user' : 'assistant'}>
        <MessageContent
          align={isUser ? 'end' : 'start'}
          width={isUser ? 'bubble' : 'transcript'}
          className="gap-3"
        >
          {!isUser && hasReasoning && (
            <Reasoning className="border-l-2 border-border-default py-1 pl-4 my-2 text-text-tertiary">
              {message.reasoning}
            </Reasoning>
          )}

          {hasToolCalls && (
            <Stack gap="sm" className="w-full">
              {message.toolCalls!.map((toolCall: ChatMessageToolCall, index: number) => (
                <Tool
                  key={toolCall.toolCallId || `tool-${index}`}
                  name={toolCall.toolName}
                  status={toolCall.type === 'tool-call' ? 'running' : 'completed'}
                >
                  <ToolInput
                    className="my-1 overflow-x-auto bg-transparent text-xs text-text-secondary"
                    children={
                      toolCall.args && Object.keys(toolCall.args).length > 0
                        ? JSON.stringify(toolCall.args, null, 2)
                        : ''
                    }
                  />
                </Tool>
              ))}
            </Stack>
          )}

          {isErrorMessage && (
            <div className="flex items-center gap-2 py-0.5 text-sm text-destructive/60">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Failed to generate a response</span>
            </div>
          )}

          {!isErrorMessage && isEditing && isUser ? (
            <Form
              className="flex w-full flex-col gap-3"
              aria-label="Edit message"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                void saveEdit()
              }}
            >
              <Textarea
                value={editContent}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setEditContent(event.target.value)}
                className="min-h-[100px] resize-none rounded-md border-default bg-background"
                autoFocus
                aria-label="Message content"
                aria-describedby="edit-instructions"
                onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (event.key === 'Escape') {
                    cancelEdit()
                  } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    void saveEdit()
                  }
                }}
              />
              <span id="edit-instructions" className="sr-only">
                Press Escape to cancel, or Ctrl+Enter to save
              </span>
              <Inline gap="sm" justify="end">
                <Button variant="outline" size="sm" onClick={cancelEdit} aria-label="Cancel editing">
                  <X className="mr-2 size-4" aria-hidden="true" />
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!canSave} aria-label="Save edited message">
                  <Save className="mr-2 size-4" aria-hidden="true" />
                  Save
                </Button>
              </Inline>
            </Form>
          ) : (
            !isErrorMessage && hasContent && (
              <>
                {isUser ? (
                  <div
                    className="inline-block"
                    style={{
                      maxWidth: chatTokens.userBubbleMaxWidth,
                      borderRadius: chatTokens.radii.bubble,
                      backgroundColor: chatTokens.surfaces.user,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: chatTokens.borders.user,
                      padding: 'var(--spacing-3) var(--spacing-4)',
                      color: chatTokens.foregrounds.user,
                      boxShadow: 'var(--shadow-low)',
                    }}
                  >
                    <MarkdownContent
                      content={message.content}
                      isStreaming={isStreaming}
                      className="prose-p:text-white prose-headings:text-white prose-strong:text-white prose-li:text-white prose-code:text-white prose-pre:bg-bg-elevated"
                    />
                  </div>
                ) : (
                  <div className="w-full text-foreground">
                    <MarkdownContent content={message.content} isStreaming={isStreaming} />
                  </div>
                )}
              </>
            )
          )}

          {showDebug && (
            <div className="w-full rounded-md border border-subtle bg-bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-text-secondary">
              <div>ID: {message.id}</div>
              <div>Role: {message.role}</div>
              <div>Created: {message.createdAt}</div>
              <div>Updated: {message.updatedAt}</div>
              <div>Streaming: {isStreaming ? 'true' : 'false'}</div>
              <div>Reasoning: {hasReasoning ? 'present' : 'none'}</div>
              <div>Tool calls: {message.toolCalls?.length ?? 0}</div>
              {message.parentMessageId && <div>Parent: {message.parentMessageId}</div>}
            </div>
          )}

          <MessageAnnotations
            className={cn('mt-0.5 text-xs text-text-tertiary/70', {
              'justify-end': isUser,
              'justify-start': !isUser,
            })}
          >
            {timestamp && (
              <>
                <span title={message.createdAt}>{timestamp}</span>
              </>
            )}
          </MessageAnnotations>

          {!isStreaming && (
            <div
              className={cn('flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100', {
                'justify-end': isUser,
                'justify-start': !isUser,
              })}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-text-tertiary hover:text-foreground"
                    aria-label="Message actions"
                  >
                    <MoreVertical className="size-3.5" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isUser ? 'end' : 'start'}>
                  <DropdownMenuItem onClick={handleCopyMessage}>
                    {copied ? (
                      <>
                        <Check className="mr-2 size-3.5" aria-hidden="true" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 size-3.5" aria-hidden="true" />
                        Copy
                      </>
                    )}
                  </DropdownMenuItem>
                  {isUser && onEdit && (
                    <DropdownMenuItem onClick={startEdit}>
                      <Edit2 className="mr-2 size-3.5" aria-hidden="true" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {!isUser && onRegenerate && (
                    <DropdownMenuItem onClick={onRegenerate}>
                      <RotateCcw className="mr-2 size-3.5" aria-hidden="true" />
                      Regenerate
                    </DropdownMenuItem>
                  )}
                  {!isUser && onSpeak && (
                    <DropdownMenuItem onClick={() => onSpeak(message.id, message.content || '')}>
                      {isSpeaking ? (
                        <>
                          <VolumeX className="mr-2 size-3.5" aria-hidden="true" />
                          Stop reading
                        </>
                      ) : (
                        <>
                          <Volume2 className="mr-2 size-3.5" aria-hidden="true" />
                          Read aloud
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleShareMessage}>
                    <Share2 className="mr-2 size-3.5" aria-hidden="true" />
                    Share
                  </DropdownMenuItem>
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onDelete} className="text-destructive">
                        <Trash2 className="mr-2 size-3.5" aria-hidden="true" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </MessageContent>
      </Message>
    </div>
  )
})
