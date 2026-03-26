import type { ChatMessageToolCall } from '@hominem/rpc/types/chat.types';
import { formatMessageTimestamp } from '@hominem/utils/dates';
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
} from 'lucide-react';
import {
  memo,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { playEnterRow, reducedMotion } from '../../lib/gsap/sequences';
import { useMessageEdit } from '../../lib/hooks/use-message-edit';
import { cn, copyToClipboard } from '../../lib/utils';
import { contentWidths } from '../../tokens';
import type { ExtendedMessage } from '../../types/chat';
import { MarkdownContent, Reasoning, Tool, ToolInput } from '../ai-elements';
import { Inline, Stack } from '../layout';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Form } from '../ui/form';
import { Textarea } from '../ui/textarea';

function Message({
  from,
  className,
  children,
  ...props
}: {
  from: 'user' | 'assistant' | 'system';
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  const isUser = from === 'user';
  const isSystem = from === 'system';

  return (
    <div
      data-role={from}
      className={cn(
        'flex w-full',
        isSystem ? 'justify-center' : isUser ? 'justify-end' : 'justify-start',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function MessageContent({
  children,
  className,
  align = 'start',
  width = 'transcript',
  style,
  ...props
}: {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'center';
  width?: 'transcript' | 'bubble' | 'full';
  style?: CSSProperties;
} & HTMLAttributes<HTMLDivElement>) {
  const maxWidth =
    width === 'bubble'
      ? contentWidths.bubble
      : width === 'transcript'
        ? contentWidths.transcript
        : undefined;

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col',
        align === 'end' && 'items-end text-right',
        align === 'center' && 'items-center text-center',
        width !== 'full' && 'w-full',
        className,
      )}
      style={{ ...style, ...(maxWidth ? { maxWidth } : undefined) }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ChatMessageProps {
  message: ExtendedMessage;
  showDebug?: boolean;
  isStreaming?: boolean;
  speakingId?: string | null;
  speechLoadingId?: string | null;
  onRegenerate?: (() => void) | undefined;
  onEdit?: ((messageId: string, newContent: string) => void) | undefined;
  onDelete?: (() => void) | undefined;
  onSpeak?: ((messageId: string, content: string) => void) | undefined;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  showDebug = false,
  isStreaming = false,
  speakingId,
  speechLoadingId,
  onRegenerate,
  onEdit,
  onDelete,
  onSpeak,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const hasContent = Boolean(message.content && message.content.trim().length > 0);
  const hasToolCalls = Boolean(
    message.toolCalls && Array.isArray(message.toolCalls) && message.toolCalls.length > 0,
  );
  const hasReasoning = Boolean(message.reasoning && message.reasoning.trim().length > 0);
  const isErrorMessage = !isUser && message.content?.startsWith('[Error:');
  const [copied, setCopied] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rowRef.current) return;
    if (reducedMotion()) return;
    // User messages pop in, assistant messages slide up smoothly
    playEnterRow(rowRef.current, isUser ? 0 : 0.02);
  }, [isUser]);

  const handleCopyMessage = async () => {
    const success = await copyToClipboard(message.content || '');
    if (success) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareMessage = async () => {
    const text = message.content;
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text }).catch(() => null);
    } else {
      const success = await copyToClipboard(text);
      if (success) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const isSpeaking = speakingId === message.id;
  const isSpeechLoading = speechLoadingId === message.id;

  const { isEditing, editContent, setEditContent, startEdit, cancelEdit, saveEdit, canSave } =
    useMessageEdit({
      initialContent: message.content || '',
      ...(onEdit && { onSave: (newContent) => onEdit(message.id, newContent) }),
    });

  const timestamp = message.createdAt ? formatMessageTimestamp(message.createdAt) : '';

  return (
    <div
      ref={rowRef}
      className="group relative"
      role="article"
      aria-label={`${isUser ? 'Your' : 'Message'}${timestamp ? ` from ${timestamp}` : ''}`}
    >
      <Message from={isUser ? 'user' : 'assistant'}>
        <MessageContent
          align={isUser ? 'end' : 'start'}
          width={isUser ? 'bubble' : 'transcript'}
          className="gap-1"
        >
          {/* ── Reasoning (assistant only) ─────────────────────────────── */}
          {!isUser && hasReasoning && (
            <div className="mb-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-inset)] px-3.5 py-2.5">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-[var(--color-text-tertiary)]">
                Thinking
              </span>
              <Reasoning className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                {message.reasoning}
              </Reasoning>
            </div>
          )}

          {/* ── Tool calls ─────────────────────────────────────────────── */}
          {hasToolCalls && (
            <Stack gap="sm" className="mb-1.5 w-full">
              {message.toolCalls!.map((toolCall: ChatMessageToolCall, index: number) => (
                <Tool
                  key={toolCall.toolCallId || `tool-${index}`}
                  name={toolCall.toolName}
                  status={toolCall.type === 'tool-call' ? 'running' : 'completed'}
                >
                  <ToolInput
                    className="my-0.5 overflow-x-auto bg-transparent font-mono text-[11px] leading-relaxed text-[var(--color-text-tertiary)]"
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

          {/* ── Error state ────────────────────────────────────────────── */}
          {isErrorMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-destructive-subtle)] px-3 py-2 text-sm text-[var(--color-destructive)]">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Failed to generate a response</span>
            </div>
          )}

          {/* ── Edit mode (user only) ──────────────────────────────────── */}
          {!isErrorMessage && isEditing && isUser ? (
            <Form
              className="flex w-full flex-col gap-2.5"
              aria-label="Edit message"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void saveEdit();
              }}
            >
              <Textarea
                value={editContent}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setEditContent(event.target.value)
                }
                className="min-h-20 resize-none rounded-xl border-[var(--color-border-default)] bg-[var(--color-bg-inset)] px-3.5 py-2.5 text-sm focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20"
                autoFocus
                aria-label="Message content"
                aria-describedby="edit-instructions"
                onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (event.key === 'Escape') {
                    cancelEdit();
                  } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    void saveEdit();
                  }
                }}
              />
              <span id="edit-instructions" className="sr-only">
                Press Escape to cancel, or Ctrl+Enter to save
              </span>
              <Inline gap="sm" justify="end">
                <Button variant="ghost" size="sm" onClick={cancelEdit} aria-label="Cancel editing">
                  <X className="mr-1.5 size-3.5" aria-hidden="true" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!canSave}
                  aria-label="Save edited message"
                >
                  <Save className="mr-1.5 size-3.5" aria-hidden="true" />
                  Save
                </Button>
              </Inline>
            </Form>
          ) : (
            !isErrorMessage &&
            hasContent && (
              <>
                {isUser ? (
                  /* ── User bubble: warm amber with ambient glow ──── */
                  <div className="inline-block max-w-136 rounded-2xl rounded-br-md bg-gradient-to-br from-[var(--color-accent)] to-[#C4956A] px-4 py-2.5 text-sm leading-relaxed text-white shadow-[0_2px_12px_rgba(212,165,116,0.2),0_1px_3px_rgba(28,25,23,0.06)]">
                    <MarkdownContent content={message.content} isStreaming={isStreaming} />
                  </div>
                ) : (
                  /* ── Assistant: clean, full-width prose ─────────────── */
                  <div className="w-full text-[var(--color-text-primary)] [&_p]:leading-[1.7] [&_p]:text-[15px]">
                    <MarkdownContent content={message.content} isStreaming={isStreaming} />
                  </div>
                )}
              </>
            )
          )}

          {/* ── Debug panel ────────────────────────────────────────────── */}
          {showDebug && (
            <div className="mt-1.5 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-inset)] px-3 py-2 font-mono text-[10px] leading-relaxed text-[var(--color-text-tertiary)]">
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

          {/* ── Inline action bar (hover) ──────────────────────────────── */}
          {!isStreaming && (
            <div
              className={cn(
                'flex items-center gap-0.5 pt-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100',
                { 'justify-end': isUser, 'justify-start': !isUser },
              )}
            >
              {/* Timestamp — always visible in the action row */}
              {timestamp && (
                <span
                  className="mr-1.5 text-[11px] tabular-nums text-[var(--color-text-tertiary)]/60"
                  title={message.createdAt}
                >
                  {timestamp}
                </span>
              )}

              {/* Inline icon buttons — flat, no dropdown for primary actions */}
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex size-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-emphasis-faint)] hover:text-[var(--color-text-primary)]"
                aria-label={copied ? 'Copied' : 'Copy message'}
              >
                {copied ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
              </button>

              {isUser && onEdit && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex size-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-emphasis-faint)] hover:text-[var(--color-text-primary)]"
                  aria-label="Edit message"
                >
                  <Edit2 className="size-3.5" aria-hidden="true" />
                </button>
              )}

              {!isUser && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="flex size-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-emphasis-faint)] hover:text-[var(--color-text-primary)]"
                  aria-label="Regenerate"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                </button>
              )}

              {/* Overflow menu for less common actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex size-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-emphasis-faint)] hover:text-[var(--color-text-primary)]"
                    aria-label="More actions"
                  >
                    <MoreVertical className="size-3.5" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isUser ? 'end' : 'start'}>
                  {!isUser && onSpeak && (
                    <DropdownMenuItem onClick={() => onSpeak(message.id, message.content || '')}>
                      {isSpeechLoading ? (
                        <>
                          <Volume2 className="mr-2 size-3.5 animate-pulse" aria-hidden="true" />
                          Loading audio
                        </>
                      ) : isSpeaking ? (
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
  );
});
