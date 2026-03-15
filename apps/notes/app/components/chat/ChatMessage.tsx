import type { ChatMessageToolCall } from '@hominem/hono-rpc/types/chat.types';
import { Form, Inline, Stack } from '@hominem/ui';
import {
  Message,
  MessageAction,
  MessageAnnotations,
  MessageContent,
  MessageResponse,
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

import { MarkdownContent } from './MarkdownContent';

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
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`${isUser ? 'Your' : 'AI Assistant'} message${timestamp ? ` from ${timestamp}` : ''}`}
    >
      <div className={cn(
        'rounded-xl px-4 py-3.5 transition-all',
        isUser 
          ? 'bg-gradient-to-br from-blue-50 to-blue-50/80 border border-blue-100/60 ml-12 shadow-sm'
          : 'bg-gradient-to-br from-slate-50 to-slate-50/80 border border-slate-100/60 mr-12 shadow-sm'
      )}>
        <Message
          from={isUser ? 'user' : 'assistant'}
          className={cn({
            'ml-8': isUser,
            'mr-8': !isUser,
          })}
        >
        <MessageContent className="gap-3">
          {/* Reasoning section (shown first for assistant messages) */}
          {!isUser && hasReasoning && <Reasoning>{message.reasoning}</Reasoning>}

          {/* Tool calls section */}
          {hasToolCalls && (
            <Stack gap="sm">
              {message.toolCalls!.map((toolCall: ChatMessageToolCall, index: number) => (
                <Tool
                  key={toolCall.toolCallId || `tool-${index}`}
                  name={toolCall.toolName}
                  status={toolCall.type === 'tool-call' ? 'running' : 'completed'}
                >
                  <ToolInput
                    className="text-xs bg-muted/50 p-2 rounded overflow-x-auto"
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
              className="flex flex-col"
              aria-label="Edit message"
              onSubmit={(e) => {
                e.preventDefault();
                saveEdit();
              }}
            >
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px] resize-none"
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
            hasContent && (
              <MessageResponse>
                <MarkdownContent
                  content={message.content}
                  isStreaming={isStreaming}
                  className={isUser ? 'prose-invert' : ''}
                />
              </MessageResponse>
            )
          )}

          {showDebug && (
            <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-[11px] font-mono leading-relaxed text-muted-foreground">
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

          {/* Message metadata */}
          <MessageAnnotations
            className={cn('text-xs opacity-70 mt-1', {
              'justify-end': isUser,
              'justify-start': !isUser,
            })}
          >
            <span>{isUser ? 'You' : 'AI Assistant'}</span>
            {timestamp && (
              <>
                <span>·</span>
                <span className="opacity-60" title={message.createdAt}>
                  {timestamp}
                </span>
              </>
            )}
          </MessageAnnotations>
        </MessageContent>
      </Message>
      </div>

      {/* Message actions menu */}
      {isHovered && !isStreaming && (
        <div className={cn('flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity', isUser ? 'justify-end' : 'justify-start')}>
          <MessageAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-70 hover:opacity-100 text-muted-foreground hover:text-foreground"
                  aria-label="Message actions menu"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <MoreVertical className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isUser ? 'end' : 'start'} role="menu">
              <DropdownMenuItem
                onClick={handleCopyMessage}
                role="menuitem"
                aria-label={copied ? 'Message copied to clipboard' : 'Copy message to clipboard'}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 size-4" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 size-4" aria-hidden="true" />
                    Copy
                  </>
                )}
              </DropdownMenuItem>
              {isUser && onEdit && (
                <DropdownMenuItem onClick={startEdit} role="menuitem" aria-label="Edit message">
                  <Edit2 className="mr-2 size-4" aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
              )}
              {!isUser && onRegenerate && (
                <DropdownMenuItem
                  onClick={onRegenerate}
                  role="menuitem"
                  aria-label="Regenerate response"
                >
                  <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                  Regenerate
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator role="separator" />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive"
                    role="menuitem"
                    aria-label="Delete message"
                  >
                    <Trash2 className="mr-2 size-4" aria-hidden="true" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </MessageAction>
        </div>
      )}
    </div>
  );
});
