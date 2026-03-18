import type { ChatMessageToolCall } from '@hominem/hono-rpc/types/chat.types';
import { Form, Inline, Stack } from '@hominem/ui';
import {
  MarkdownContent,
  Message,
  MessageAnnotations,
  MessageContent,
  Reasoning,
  Tool,
  ToolInput,
} from '@hominem/ui/ai-elements';
import { Button } from '@hominem/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@hominem/ui/dropdown';
import { Textarea } from '@hominem/ui/textarea';
import { formatMessageTimestamp } from '@hominem/utils/dates';
import { Check, Copy, Edit2, MoreVertical, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { memo, useState } from 'react';

import { useMessageEdit } from '~/lib/hooks/use-message-edit';
import type { ExtendedMessage } from '~/lib/types/chat-message';
import { cn } from '~/lib/utils';
import { copyToClipboard } from '~/lib/utils/clipboard';

interface ChatMessageProps {
  message: ExtendedMessage;
  showDebug?: boolean;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: () => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  showDebug = false,
  isStreaming = false,
  onRegenerate,
  onEdit,
  onDelete,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const hasContent = message.content && message.content.trim().length > 0;
  const hasToolCalls =
    message.toolCalls && Array.isArray(message.toolCalls) && message.toolCalls.length > 0;
  const hasReasoning = message.reasoning && message.reasoning.trim().length > 0;
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopyMessage = async () => {
    const success = await copyToClipboard(message.content || '');
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { isEditing, editContent, setEditContent, startEdit, cancelEdit, saveEdit, canSave } =
    useMessageEdit({
      initialContent: message.content || '',
      ...(onEdit && { onSave: (newContent) => onEdit(message.id, newContent) }),
    });

  const timestamp = message.createdAt ? formatMessageTimestamp(message.createdAt) : '';

  return (
    <div
      className="group py-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`${isUser ? 'Your' : 'AI Assistant'} message${timestamp ? ` from ${timestamp}` : ''}`}
    >
      <Message from={isUser ? 'user' : 'assistant'}>
        <MessageContent
          align={isUser ? 'end' : 'start'}
          width={isUser ? 'bubble' : 'transcript'}
          className="gap-3"
        >
          {/* Reasoning section (shown first for assistant messages) */}
          {!isUser && hasReasoning && (
            <Reasoning className="text-text-tertiary border-l-2 border-border-subtle pl-4 py-1 my-2">
              {message.reasoning}
            </Reasoning>
          )}

          {/* Tool calls section */}
          {hasToolCalls && (
            <Stack gap="sm" className="w-full">
              {message.toolCalls!.map((toolCall: ChatMessageToolCall, index: number) => (
                <Tool
                  key={toolCall.toolCallId || `tool-${index}`}
                  name={toolCall.toolName}
                  status={toolCall.type === 'tool-call' ? 'running' : 'completed'}
                >
                  <ToolInput
                    className="overflow-x-auto text-xs text-text-secondary bg-transparent my-1"
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

          {/* Main content with markdown rendering or edit mode */}
          {isEditing && isUser ? (
            <Form
              className="flex w-full flex-col gap-3"
              aria-label="Edit message"
              onSubmit={(e) => {
                e.preventDefault();
                saveEdit();
              }}
            >
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px] resize-none rounded-xl border-default bg-background"
                autoFocus
                aria-label="Message content"
                aria-describedby="edit-instructions"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    cancelEdit();
                  } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    saveEdit();
                  }
                }}
              />
              <span id="edit-instructions" className="sr-only">
                Press Escape to cancel, or Ctrl+Enter to save
              </span>
              <Inline gap="sm" justify="end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelEdit}
                  aria-label="Cancel editing"
                >
                  <X className="mr-2 size-4" aria-hidden="true" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!canSave}
                  aria-label="Save edited message"
                >
                  <Save className="mr-2 size-4" aria-hidden="true" />
                  Save
                </Button>
              </Inline>
            </Form>
          ) : (
            hasContent &&
            (isUser ? (
              // User message - compact bubble style
              <div className="inline-block max-w-[85%] sm:max-w-[75%] rounded-2xl bg-bg-surface border border-subtle px-4 py-3 text-foreground shadow-sm">
                <MarkdownContent
                  content={message.content}
                  isStreaming={isStreaming}
                  className="prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-code:text-foreground prose-pre:bg-bg-elevated"
                />
              </div>
            ) : (
              // Assistant message - full width transcript style (no bubble)
              <div className="w-full text-foreground">
                <MarkdownContent content={message.content} isStreaming={isStreaming} />
              </div>
            ))
          )}

          {showDebug && (
            <div className="w-full rounded-md border border-subtle bg-bg-surface px-3 py-2 text-[11px] font-mono leading-relaxed text-text-secondary">
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

          {/* Message metadata - minimal */}
          <MessageAnnotations
            className={cn('mt-0.5 text-xs text-text-tertiary/70', {
              'justify-end': isUser,
              'justify-start': !isUser,
            })}
          >
            <span>{isUser ? 'You' : 'AI Assistant'}</span>
            {timestamp && (
              <>
                <span>·</span>
                <span title={message.createdAt}>{timestamp}</span>
              </>
            )}
          </MessageAnnotations>

          {/* Actions - appear on hover */}
          {isHovered && !isStreaming && (
            <div
              className={cn(
                'flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100',
                {
                  'justify-end': isUser,
                  'justify-start': !isUser,
                },
              )}
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
  );
});
