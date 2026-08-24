import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { Check, Clipboard, Pencil, RotateCcw, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '~/components/ai-elements/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '~/components/ai-elements/reasoning';
import {
  Tool,
  ToolApprovalActions,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolPreview,
} from '~/components/ai-elements/tool';
import { SpeechPlayer } from '~/components/chat/speech-player';
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
  onActivateSpeech?: (messageId: string) => void;
  onApproveTool?: (input: { messageId: string; toolCallId: string }) => void;
  onDeactivateSpeech?: (messageId: string) => void;
  onRejectTool?: (input: { messageId: string; toolCallId: string }) => void;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => Promise<void> | void;
}

function toMessageRole(role: ChatMessageDto['role']): 'user' | 'assistant' {
  return role === 'assistant' ? 'assistant' : 'user';
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
  onActivateSpeech,
  onApproveTool,
  onDeactivateSpeech,
  onRejectTool,
  onRegenerate,
  onEdit,
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [editError, setEditError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const canEdit = message.role === 'user' && !message.isStreaming && Boolean(onEdit);
  const hasReasoning = Boolean(message.reasoning?.trim());
  const hasReferencedNotes = (message.referencedNotes?.length ?? 0) > 0;
  const timestamp = formatTimestamp(message.createdAt);

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
    if (navigator.share) {
      await navigator.share({ text: message.content });
      return;
    }
    const url = URL.createObjectURL(new Blob([message.content], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.download = `message-${message.id}.txt`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  const canSpeak =
    message.role === 'assistant' &&
    message.content.trim().length > 0 &&
    !message.isStreaming &&
    speechSrc &&
    onActivateSpeech &&
    onDeactivateSpeech;

  return (
    <Message from={toMessageRole(message.role)}>
      <MessageContent>
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
              <MessageAction label="Save edit" onClick={() => void saveEdit()} tooltip="Save edit">
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
          <MessageResponse>{message.content}</MessageResponse>
        )}
        {message.failed ? (
          <p aria-live="polite" className="text-xs text-destructive" role="alert">
            {message.role === 'assistant'
              ? 'Response interrupted.'
              : `${message.error || 'Message failed to send.'} Retry when ready.`}
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
            {message.role === 'assistant' && !message.isStreaming && message.content.trim() ? (
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
                  label="Share assistant message"
                  onClick={() => void shareMessage()}
                  tooltip="Share message"
                >
                  <Share2 aria-hidden="true" size={14} />
                </MessageAction>
              </>
            ) : null}
            {canEdit ? (
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
            {message.role === 'assistant' && onRegenerate ? (
              <MessageAction
                disabled={isToolResponding || message.isStreaming || isRegenerating}
                label="Regenerate response"
                onClick={() => onRegenerate(message.id)}
                tooltip="Regenerate response"
              >
                <RotateCcw aria-hidden="true" size={14} />
              </MessageAction>
            ) : null}
          </MessageActions>
        ) : null}
      </MessageContent>
    </Message>
  );
}
