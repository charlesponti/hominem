import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { Check, Clipboard, Pencil, RotateCcw, Share2, Trash2, X } from 'lucide-react';
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from 'motion/react';
import { memo, useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/alert-dialog';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '~/components/chat/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '~/components/chat/reasoning';
import { Shimmer } from '~/components/chat/shimmer';
import { SpeechPlayer } from '~/components/chat/speech-player';
import {
  getToolCallStatus,
  Tool,
  ToolApprovalActions,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolPreview,
} from '~/components/chat/tool';
import type { RegenerationStatus } from '~/lib/hooks/use-regenerate-message';
import type { ChatMessageView } from '~/lib/types/chat';
import { cn } from '~/lib/utils';

type ChatToolCall = NonNullable<ChatMessageDto['toolCalls']>[number];

const messageTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatMessageTimestamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : messageTimestampFormatter.format(date);
};

export interface ChatMessageProps {
  message: ChatMessageView;
  showDebug?: boolean;
  formatTimestamp?: (value: string) => string;
  speechSrc?: string;
  isSpeechActive?: boolean;
  isToolResponding?: boolean;
  isRegenerating?: boolean;
  regenerationStatus?: RegenerationStatus;
  isGenerationActive?: boolean;
  regenerationError?: string | null;
  onActivateSpeech?: (messageId: string) => void;
  onApproveTool?: (input: { messageId: string; toolCallId: string }) => void;
  onDeactivateSpeech?: (messageId: string) => void;
  onRejectTool?: (input: { messageId: string; toolCallId: string }) => void;
  onRegenerate?: (messageId: string) => void;
  onCancelRegenerate?: () => void;
  onRetryRegenerate?: () => void;
  onEdit?: (messageId: string, content: string) => Promise<void> | void;
  onDelete?: (messageId: string) => Promise<void>;
  isDeleting?: boolean;
}

function toMessageRole(role: ChatMessageDto['role']): 'user' | 'assistant' {
  return role === 'user' ? 'user' : 'assistant';
}

function ToolCall({
  messageId,
  toolCall,
  isToolResponding,
  onApprove,
  onReject,
}: {
  messageId: string;
  toolCall: ChatToolCall;
  isToolResponding: boolean;
  onApprove?: ChatMessageProps['onApproveTool'];
  onReject?: ChatMessageProps['onRejectTool'];
}) {
  const status = getToolCallStatus(toolCall);
  const isPending = toolCall.confirmationStatus === 'pending';

  return (
    <Tool defaultOpen={isPending}>
      <ToolHeader status={status} toolName={toolCall.toolName} />
      <ToolContent>
        {toolCall.preview ? (
          <ToolPreview preview={toolCall.preview} />
        ) : (
          <ToolInput input={toolCall.args} />
        )}
        {isPending && onApprove && onReject ? (
          <ToolApprovalActions
            disabled={isToolResponding}
            onApprove={() => onApprove({ messageId, toolCallId: toolCall.toolCallId })}
            onReject={() => onReject({ messageId, toolCallId: toolCall.toolCallId })}
          />
        ) : null}
      </ToolContent>
    </Tool>
  );
}

export const ChatMessage = memo(function ChatMessage({
  message,
  showDebug = false,
  formatTimestamp = formatMessageTimestamp,
  speechSrc,
  isSpeechActive = false,
  isToolResponding = false,
  isRegenerating = false,
  regenerationStatus = 'idle',
  isGenerationActive = false,
  regenerationError,
  onActivateSpeech,
  onApproveTool,
  onDeactivateSpeech,
  onRejectTool,
  onRegenerate,
  onCancelRegenerate,
  onRetryRegenerate,
  onEdit,
  onDelete,
  isDeleting = false,
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'shared' | 'failed'>('idle');
  const reduceMotion = useReducedMotion() === true;
  const isRegenerationActive =
    isRegenerating ||
    regenerationStatus === 'preparing' ||
    regenerationStatus === 'streaming' ||
    regenerationStatus === 'stopping';
  const isRegenerationStopping = regenerationStatus === 'stopping';
  const isUserNotStreaming = message.role === 'user' && !message.isStreaming;
  const canEdit = isUserNotStreaming && Boolean(onEdit);
  const canDelete = isUserNotStreaming && Boolean(onDelete);
  const hasReasoning = Boolean(message.reasoning?.trim());
  const presentationState = message.failed
    ? message.role === 'assistant'
      ? 'interrupted'
      : 'failed'
    : message.isStreaming
      ? 'streaming'
      : 'complete';

  useEffect(() => {
    if (!isEditing) setDraft(message.content);
  }, [isEditing, message.content]);

  async function saveEdit() {
    const content = draft.trim();
    if (!content) {
      setEditError('Message cannot be empty.');
      return;
    }
    try {
      await onEdit?.(message.id, content);
      setEditError(null);
      setIsEditing(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Unable to update this message.');
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  async function shareMessage() {
    try {
      if (navigator.share) {
        await navigator.share({ text: message.content });
      } else {
        const url = URL.createObjectURL(new Blob([message.content], { type: 'text/plain' }));
        const link = document.createElement('a');
        link.download = `message-${message.id}.txt`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
      setShareState('shared');
    } catch {
      setShareState('failed');
    }
  }

  async function confirmDelete() {
    if (!onDelete) return;
    try {
      await onDelete(message.id);
      setDeleteError(null);
      setIsDeleteOpen(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete this message.');
    }
  }

  const canSpeak =
    message.role === 'assistant' &&
    message.content.trim().length > 0 &&
    !message.isStreaming &&
    speechSrc &&
    onActivateSpeech &&
    onDeactivateSpeech;

  return (
    <LazyMotion features={domAnimation}>
      <Message
        aria-label={`Message ${presentationState}`}
        className={cn('ml-0! max-w-full! justify-start!', {
          'mt-4': message.role === 'user',
        })}
        data-presentation-state={presentationState}
        from={toMessageRole(message.role)}
      >
        <MessageContent className="ml-0! w-full!">
          <AnimatePresence initial={false} mode="wait">
            {isRegenerationActive ? (
              <m.div
                animate={{ opacity: 1, transform: reduceMotion ? 'none' : 'translateY(0px)' }}
                className="min-h-6"
                exit={{ opacity: 0, transform: reduceMotion ? 'none' : 'translateY(-4px)' }}
                initial={{ opacity: 0, transform: reduceMotion ? 'none' : 'translateY(4px)' }}
                key="regeneration-thinking"
                transition={{
                  duration: reduceMotion ? 0.08 : 0.18,
                  ease: [0.23, 1, 0.32, 1],
                }}
              >
                <Shimmer duration={1}>Thinking</Shimmer>
              </m.div>
            ) : (
              <m.div
                animate={{ opacity: 1, transform: reduceMotion ? 'none' : 'translateY(0px)' }}
                initial={{ opacity: 0, transform: reduceMotion ? 'none' : 'translateY(4px)' }}
                key={`message-content-${message.id}`}
                transition={{
                  duration: reduceMotion ? 0.08 : 0.18,
                  ease: [0.23, 1, 0.32, 1],
                }}
              >
                {hasReasoning ? (
                  <Reasoning defaultOpen={false} isStreaming={Boolean(message.isStreaming)}>
                    <ReasoningTrigger aria-label="Toggle reasoning" />
                    <ReasoningContent>{message.reasoning ?? ''}</ReasoningContent>
                  </Reasoning>
                ) : null}
                {message.toolCalls?.map((toolCall) => (
                  <ToolCall
                    key={toolCall.toolCallId}
                    isToolResponding={isToolResponding}
                    messageId={message.id}
                    onApprove={onApproveTool}
                    onReject={onRejectTool}
                    toolCall={toolCall}
                  />
                ))}
                {isEditing ? (
                  <div className="flex min-w-72 flex-col gap-2">
                    <textarea
                      aria-label="Edit message"
                      autoFocus
                      className="min-h-20 rounded-md border border-border bg-background p-2 text-sm"
                      onChange={(event) => setDraft(event.target.value)}
                      value={draft}
                    />
                    {editError ? <p className="text-xs text-destructive">{editError}</p> : null}
                    <div className="flex gap-1">
                      <MessageAction
                        label="Save edit"
                        onClick={() => void saveEdit()}
                        tooltip="Save edit"
                      >
                        <Check aria-hidden="true" size={14} />
                      </MessageAction>
                      <MessageAction
                        label="Cancel edit"
                        onClick={() => {
                          setDraft(message.content);
                          setEditError(null);
                          setIsEditing(false);
                        }}
                        tooltip="Cancel edit"
                      >
                        <X aria-hidden="true" size={14} />
                      </MessageAction>
                    </div>
                  </div>
                ) : (
                  <>
                    {message.isStreaming ? (
                      <p
                        aria-label="Response is streaming"
                        className="text-sm text-muted-foreground"
                        role="status"
                      >
                        <Shimmer as="span" duration={1}>
                          Thinking
                        </Shimmer>
                      </p>
                    ) : null}
                    <MessageResponse className="font-assistant">{message.content}</MessageResponse>
                  </>
                )}
              </m.div>
            )}
          </AnimatePresence>
          {message.failed ? (
            <p aria-live="polite" className="text-xs text-destructive" role="alert">
              {message.role === 'assistant'
                ? 'Response interrupted. The previous content is preserved.'
                : `${message.error || 'Message failed to send.'} Retry when ready.`}
            </p>
          ) : null}
          {regenerationError ? (
            <p aria-live="polite" className="text-xs text-destructive" role="alert">
              {regenerationError}
              {onRetryRegenerate ? (
                <button className="ml-1 underline" onClick={onRetryRegenerate} type="button">
                  Retry
                </button>
              ) : null}
            </p>
          ) : null}
          {deleteError ? (
            <p aria-live="polite" className="text-xs text-destructive" role="alert">
              {deleteError} Try again when ready.
            </p>
          ) : null}
          {showDebug && !message.isStreaming ? (
            <details className="rounded-md border border-border p-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Debug details</summary>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 font-mono">
                <dt>ID</dt>
                <dd>{message.id}</dd>
                <dt>Role</dt>
                <dd>{message.role}</dd>
                <dt>Created</dt>
                <dd>{formatTimestamp(message.createdAt)}</dd>
                <dt>Reasoning</dt>
                <dd>{hasReasoning ? 'present' : 'none'}</dd>
                <dt>Tool calls</dt>
                <dd>{message.toolCalls?.length ?? 0}</dd>
              </dl>
            </details>
          ) : null}
          {canEdit ||
          canDelete ||
          (message.role === 'assistant' && onRegenerate) ||
          (message.role === 'assistant' && !message.isStreaming && message.content.trim()) ? (
            <MessageActions className="justify-end">
              {canSpeak ? (
                <SpeechPlayer
                  isActive={isSpeechActive}
                  messageId={message.id}
                  onActivate={onActivateSpeech}
                  onDeactivate={onDeactivateSpeech}
                  src={speechSrc}
                />
              ) : null}
              {message.role === 'assistant' &&
              !message.isStreaming &&
              !isRegenerationActive &&
              message.content.trim() ? (
                <>
                  <MessageAction
                    label={
                      copyState === 'copied'
                        ? 'Copied assistant message'
                        : copyState === 'failed'
                          ? 'Copy assistant message failed'
                          : 'Copy assistant message'
                    }
                    onClick={() => void copyMessage()}
                    tooltip={
                      copyState === 'copied'
                        ? 'Copied'
                        : copyState === 'failed'
                          ? 'Copy failed'
                          : 'Copy message'
                    }
                  >
                    <Clipboard aria-hidden="true" size={14} />
                  </MessageAction>
                  <MessageAction
                    label={
                      shareState === 'shared'
                        ? 'Shared assistant message'
                        : shareState === 'failed'
                          ? 'Share assistant message failed'
                          : 'Share assistant message'
                    }
                    onClick={() => void shareMessage()}
                    tooltip={
                      shareState === 'shared'
                        ? 'Shared'
                        : shareState === 'failed'
                          ? 'Share failed'
                          : 'Share message'
                    }
                  >
                    <Share2 aria-hidden="true" size={14} />
                  </MessageAction>
                </>
              ) : null}
              {canEdit && !isRegenerationActive ? (
                <MessageAction
                  label="Edit message"
                  onClick={() => {
                    setDraft(message.content);
                    setEditError(null);
                    setIsEditing(true);
                  }}
                  tooltip="Edit message"
                >
                  <Pencil aria-hidden="true" size={14} />
                </MessageAction>
              ) : null}
              {canDelete ? (
                <AlertDialog
                  onOpenChange={(open) => {
                    setIsDeleteOpen(open);
                    if (open) setDeleteError(null);
                  }}
                  open={isDeleteOpen}
                >
                  <AlertDialogTrigger asChild>
                    <MessageAction
                      disabled={isDeleting || isGenerationActive || isEditing}
                      label="Delete user message"
                      tooltip="Delete message"
                    >
                      <Trash2 aria-hidden="true" size={14} />
                    </MessageAction>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete this message and all later messages in the conversation.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={isDeleting}
                        onClick={(event) => {
                          event.preventDefault();
                          void confirmDelete();
                        }}
                      >
                        {isDeleting ? 'Deleting…' : 'Delete message'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
              {message.role === 'assistant' && onRegenerate ? (
                <MessageAction
                  disabled={
                    isToolResponding ||
                    message.isStreaming ||
                    (isGenerationActive && !isRegenerationActive) ||
                    isRegenerationStopping
                  }
                  label={
                    isRegenerationStopping
                      ? 'Stopping regeneration'
                      : isRegenerationActive
                        ? 'Stop regenerating response'
                        : 'Regenerate response'
                  }
                  onClick={() => {
                    if (isRegenerationActive && !isRegenerationStopping) {
                      onCancelRegenerate?.();
                    } else if (!isRegenerationActive) {
                      onRegenerate(message.id);
                    }
                  }}
                  tooltip={
                    isRegenerationStopping
                      ? 'Stopping regeneration'
                      : isRegenerationActive
                        ? 'Stop regenerating response'
                        : 'Regenerate response'
                  }
                >
                  <AnimatePresence initial={false} mode="wait">
                    <m.span
                      animate={{ opacity: 1, transform: reduceMotion ? 'none' : 'scale(1)' }}
                      exit={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.9)' }}
                      initial={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.9)' }}
                      key={
                        isRegenerationStopping
                          ? 'stopping'
                          : isRegenerationActive
                            ? 'active'
                            : 'idle'
                      }
                      transition={{
                        duration: reduceMotion ? 0.08 : 0.15,
                        ease: [0.23, 1, 0.32, 1],
                      }}
                    >
                      {isRegenerationStopping ? (
                        <span
                          aria-hidden="true"
                          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                        />
                      ) : isRegenerationActive ? (
                        <X aria-hidden="true" size={14} />
                      ) : (
                        <RotateCcw aria-hidden="true" size={14} />
                      )}
                    </m.span>
                  </AnimatePresence>
                </MessageAction>
              ) : null}
            </MessageActions>
          ) : null}
        </MessageContent>
      </Message>
    </LazyMotion>
  );
});
