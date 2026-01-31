import type { ChatMessageToolCall } from '@hominem/hono-rpc/types';

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

import type { ExtendedMessage } from '~/lib/types/chat-message';

import { useMessageEdit } from '~/lib/hooks/use-message-edit';
import { cn } from '~/lib/utils';
import { copyToClipboard } from '~/lib/utils/clipboard';

import { MarkdownContent } from './MarkdownContent';
import { ReasoningPart } from './ReasoningPart';
import { ToolInvocationPart } from './ToolInvocationPart';

interface ChatMessageProps {
  message: ExtendedMessage;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: () => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
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
    <article
      className={cn('group relative p-4 rounded-lg flex flex-col gap-3', {
        'bg-primary text-primary-foreground ml-12': isUser,
        'bg-muted mr-12': !isUser,
      })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`${isUser ? 'Your' : 'AI Assistant'} message${timestamp ? ` from ${timestamp}` : ''}`}
    >
      {/* Message actions menu */}
      {isHovered && !isStreaming && (
        <div
          className={cn('absolute top-2', {
            'right-2': isUser,
            'left-2': !isUser,
          })}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-70 hover:opacity-100"
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
        </div>
      )}

      {/* Reasoning section (shown first for assistant messages) */}
      {!isUser && hasReasoning && <ReasoningPart reasoning={message.reasoning!} index={0} />}

      {/* Tool calls section */}
      {hasToolCalls && (
        <div className="flex flex-col gap-2">
          {message.toolCalls!.map((toolCall: ChatMessageToolCall, index: number) => (
            <ToolInvocationPart
              key={toolCall.toolCallId || `tool-${index}`}
              toolInvocation={toolCall}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Main content with markdown rendering or edit mode */}
      {isEditing && isUser ? (
        <form
          className="flex flex-col gap-2"
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
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={cancelEdit} aria-label="Cancel editing">
              <X className="mr-2 size-4" aria-hidden="true" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveEdit}
              disabled={!canSave}
              aria-label="Save edited message"
            >
              <Save className="mr-2 size-4" aria-hidden="true" />
              Save
            </Button>
          </div>
        </form>
      ) : (
        hasContent && (
          <div>
            <MarkdownContent
              content={message.content}
              isStreaming={isStreaming}
              className={isUser ? 'prose-invert' : ''}
            />
          </div>
        )
      )}

      {/* Message metadata */}
      <div
        className={cn('flex items-center gap-2 text-xs opacity-70 mt-1', {
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
      </div>
    </article>
  );
});
