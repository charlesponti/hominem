import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';

import { Message, MessageContent, MessageResponse } from '~/components/ai-elements/message';
import {
  Tool,
  ToolApprovalActions,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolPreview,
} from '~/components/ai-elements/tool';
import { SpeechPlayer } from '~/components/chat/speech-player';

export type ChatMessageWithStreaming = ChatMessageDto & { isStreaming?: boolean };
type ChatToolCall = NonNullable<ChatMessageDto['toolCalls']>[number];

export interface ChatMessageProps {
  message: ChatMessageWithStreaming;
  speechSrc?: string;
  isSpeechActive?: boolean;
  isToolResponding?: boolean;
  onActivateSpeech?: (messageId: string) => void;
  onApproveTool?: (input: { messageId: string; toolCallId: string }) => void;
  onDeactivateSpeech?: (messageId: string) => void;
  onRejectTool?: (input: { messageId: string; toolCallId: string }) => void;
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
  onActivateSpeech,
  onApproveTool,
  onDeactivateSpeech,
  onRejectTool,
}: ChatMessageProps) {
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
        <MessageResponse>{message.content}</MessageResponse>
        {canSpeak ? (
          <SpeechPlayer
            isActive={isSpeechActive}
            messageId={message.id}
            onActivate={onActivateSpeech}
            onDeactivate={onDeactivateSpeech}
            src={speechSrc}
          />
        ) : null}
      </MessageContent>
    </Message>
  );
}
