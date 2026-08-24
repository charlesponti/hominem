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
        {canSpeak ? (
          <SpeechPlayer
            isActive={isSpeechActive}
            messageId={message.id}
            onActivate={onActivateSpeech}
            onDeactivate={onDeactivateSpeech}
            src={speechSrc}
          />
        ) : null}
        {canEdit ||
        (message.role === 'assistant' && onRegenerate) ||
        (message.role === 'assistant' && !message.isStreaming && message.content.trim()) ? (
          <MessageActions>
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
