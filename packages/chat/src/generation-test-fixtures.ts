import type { GenerationHistoryEventPayload, GenerationToolCall } from './generation-machine';
import type { ChatMessageSnapshot, ChatSnapshot } from './generation-schemas';

export function chatSnapshot(overrides: Partial<ChatSnapshot> = {}): ChatSnapshot {
  return {
    id: 'chat-1',
    userId: 'user-1',
    title: 'Chat',
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function messageSnapshot(
  overrides: Partial<ChatMessageSnapshot> & Pick<ChatMessageSnapshot, 'id' | 'chatId' | 'content'>,
): ChatMessageSnapshot {
  return {
    ...overrides,
    userId: 'user-1',
    role: 'assistant',
    files: null,
    toolCalls: null,
    reasoning: null,
    parentMessageId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

export function toolEventRoundTripFixture(
  options: {
    chatId?: string;
    userMessageId?: string | null;
    assistantMessageId?: string;
  } = {},
): readonly GenerationHistoryEventPayload[] {
  const chatId = options.chatId ?? 'chat-1';
  const userMessageId = options.userMessageId ?? null;
  const assistantMessageId = options.assistantMessageId ?? 'assistant-1';
  const firstCall: GenerationToolCall = {
    id: 'call-search',
    name: 'search',
    arguments: '{"query":"hominem"}',
    iteration: 0,
    turnId: 'turn-1',
  };
  const secondCall: GenerationToolCall = {
    id: 'call-write',
    name: 'write_memory',
    arguments: '{"value":"remember this"}',
    iteration: 1,
    turnId: 'turn-2',
  };
  const assistantMessage = messageSnapshot({
    id: assistantMessageId,
    chatId,
    content: 'Saved',
    reasoning: 'The tool result was persisted.',
  });

  return [
    {
      type: 'generation.started',
      context: {
        chatId,
        kind: 'send',
        userMessageId,
        targetAssistantMessageId: null,
        requestContext: { source: 'round-trip-test' },
      },
    },
    {
      type: 'generation.accepted',
      chatId,
      chat: chatSnapshot(),
      userMessage: messageSnapshot({ id: 'user-1', chatId, role: 'user', content: 'Save' }),
    },
    { type: 'generation.phase_changed', phase: 'running' },
    { type: 'tool.requested', call: firstCall },
    {
      type: 'tool.completed',
      result: {
        callId: firstCall.id,
        toolName: firstCall.name,
        content: '{"items":[]}',
        error: false,
      },
    },
    { type: 'confirmation.required', call: secondCall },
    {
      type: 'confirmation.rejected',
      callId: secondCall.id,
      reason: 'User rejected the write',
      call: secondCall,
    },
    { type: 'generation.retry_scheduled', attempt: 1, maxAttempts: 2 },
    { type: 'tool.requested', call: secondCall },
    {
      type: 'tool.failed',
      result: {
        callId: secondCall.id,
        toolName: secondCall.name,
        content: 'Tool execution failed',
        error: true,
      },
    },
    { type: 'generation.committed', message: assistantMessage },
  ];
}
