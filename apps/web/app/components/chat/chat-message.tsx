import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { Check, Clipboard, Pencil, RotateCcw, Share2, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '~/components/ai-elements/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '~/components/ai-elements/reasoning';
import { Shimmer } from '~/components/ai-elements/shimmer';
import {
  Tool,
  ToolApprovalActions,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolPreview,
} from '~/components/ai-elements/tool';
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
import { SpeechPlayer } from '~/components/chat/speech-player';
import type { RegenerationStatus } from '~/lib/hooks/use-regenerate-message';
import type { ChatMessageView } from '~/lib/types/chat';

type ChatToolCall = NonNullable<ChatMessageDto['toolCalls']>[number];

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
  const isPending = toolCall.status === 'pending';

  return (
    <Tool defaultOpen={isPending}>
      <ToolHeader
        state={
          isPending
            ? 'approval-requested'
            : toolCall.status === 'rejected'
              ? 'output-denied'
              : 'output-available'
        }
        toolName={toolCall.toolName}
        type="dynamic-tool"
      />
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

export function ChatMessage({
  message,
  showDebug = false,
  formatTimestamp = (value) => new Date(value).toLocaleTimeString(),
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
  const canEdit = message.role === 'user' && !message.isStreaming && Boolean(onEdit);
  const canDelete = message.role === 'user' && !message.isStreaming && Boolean(onDelete);
  const hasReasoning = Boolean(message.reasoning?.trim());
  const hasReferencedNotes = (message.referencedNotes?.length ?? 0) > 0;
  const timestamp = formatTimestamp(message.createdAt);
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
    <Message
      aria-label={`Message ${presentationState}`}
      data-presentation-state={presentationState}
      from={toMessageRole(message.role)}
    >
      <MessageContent>
        <AnimatePresence initial={false} mode="wait">
          {isRegenerationActive ? (
            <motion.div
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
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, transform: reduceMotion ? 'none' : 'translateY(0px)' }}
              initial={{ opacity: 0, transform: reduceMotion ? 'none' : 'translateY(4px)' }}
              key={`message-content-${message.id}-${message.updatedAt}`}
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
              {hasReferencedNotes ? (
                <div aria-label="Referenced notes" className="flex flex-wrap gap-1.5" role="list">
                  {message.referencedNotes?.map((note) => (
                    <span
                      aria-label={`Referenced note: ${note.title || note.id}`}
                      className="rounded-full border border-border-subtle px-2.5 py-1 text-xs text-text-secondary"
                      key={note.id}
                      role="listitem"
                    >
                      {note.title || note.id}
                    </span>
                  ))}
                </div>
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
                    className="min-h-20 rounded-md border border-border-subtle bg-background p-2 text-sm"
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
                      className="text-sm text-text-secondary"
                      role="status"
                    >
                      <Shimmer as="span" duration={1}>
                        Thinking
                      </Shimmer>
                    </p>
                  ) : null}
                  <MessageResponse>{message.content}</MessageResponse>
                </>
              )}
            </motion.div>
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
          <details className="rounded-md border border-border-subtle p-2 text-xs text-text-secondary">
            <summary className="cursor-pointer">Debug details</summary>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 font-mono">
              <dt>ID</dt>
              <dd>{message.id}</dd>
              <dt>Role</dt>
              <dd>{message.role}</dd>
              <dt>Created</dt>
              <dd>
                {new Date(message.createdAt).toLocaleTimeString([], {
                  month: '2-digit',
                  day: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
              <dt>Reasoning</dt>
              <dd>{hasReasoning ? 'present' : 'none'}</dd>
              <dt>Tool calls</dt>
              <dd>{message.toolCalls?.length ?? 0}</dd>
            </dl>
          </details>
        ) : null}
        {timestamp ||
        canEdit ||
        canDelete ||
        (message.role === 'assistant' && onRegenerate) ||
        (message.role === 'assistant' && !message.isStreaming && message.content.trim()) ? (
          <MessageActions>
            {timestamp ? (
              <span aria-label={`Sent ${timestamp}`} className="mr-1 text-xs text-text-secondary">
                {timestamp}
              </span>
            ) : null}
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
                  <motion.span
                    animate={{ opacity: 1, transform: reduceMotion ? 'none' : 'scale(1)' }}
                    exit={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.9)' }}
                    initial={{ opacity: 0, transform: reduceMotion ? 'none' : 'scale(0.9)' }}
                    key={
                      isRegenerationStopping ? 'stopping' : isRegenerationActive ? 'active' : 'idle'
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
                  </motion.span>
                </AnimatePresence>
              </MessageAction>
            ) : null}
          </MessageActions>
        ) : null}
      </MessageContent>
    </Message>
  );
}
