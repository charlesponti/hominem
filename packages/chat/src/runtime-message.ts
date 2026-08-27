import type { ChatMessageItem, ChatMessageToolCall } from './chat.types';

type RuntimePart = Record<string, unknown>;

function asRecord(value: unknown): RuntimePart {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RuntimePart) : {};
}

function partsOf(message: unknown): RuntimePart[] {
  const parts = asRecord(message).parts;
  return Array.isArray(parts) ? parts.map(asRecord) : [];
}

function partText(part: RuntimePart): string {
  return typeof part.content === 'string'
    ? part.content
    : typeof part.text === 'string'
      ? part.text
      : '';
}

function parseArgs(part: RuntimePart): Record<string, unknown> {
  if (part.input && typeof part.input === 'object' && !Array.isArray(part.input)) {
    return part.input as Record<string, unknown>;
  }
  if (typeof part.arguments !== 'string') return {};
  try {
    const value = JSON.parse(part.arguments);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function toolStatus(part: RuntimePart): ChatMessageToolCall['status'] {
  switch (part.state) {
    case 'approval-requested':
      return 'pending';
    case 'output-available':
      return 'completed';
    case 'output-error':
      return 'failed';
    case 'output-denied':
      return 'rejected';
    case 'input-available':
      return 'running';
    default:
      return 'requested';
  }
}

export function runtimeMessageToChatMessage(value: unknown, chatId: string): ChatMessageItem | null {
  const message = asRecord(value);
  const role = message.role;
  if (role !== 'user' && role !== 'assistant') return null;
  const parts = partsOf(value);
  const toolCalls = parts
    .filter((part) => part.type === 'tool-call')
    .map((part) => ({
      toolCallId: typeof part.id === 'string' ? part.id : `${message.id}:tool`,
      toolName: typeof part.name === 'string' ? part.name : 'tool',
      type: 'tool-call' as const,
      args: parseArgs(part),
      ...(part.output !== undefined ? { output: part.output } : {}),
      status: toolStatus(part),
      ...(part.approval && typeof part.approval === 'object'
        ? { preview: asRecord(part.approval).preview as Record<string, unknown> | null }
        : {}),
    }));
  const content = parts
    .filter((part) => part.type === 'text')
    .map(partText)
    .join('');
  const reasoning = parts
    .filter((part) => part.type === 'thinking')
    .map(partText)
    .join('');
  return {
    id: typeof message.id === 'string' ? message.id : `${chatId}:runtime`,
    renderKey: typeof message.id === 'string' ? message.id : undefined,
    role,
    message: content,
    created_at:
      message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : typeof message.createdAt === 'string'
          ? message.createdAt
          : new Date().toISOString(),
    chat_id: chatId,
    profile_id: '',
    reasoning: reasoning || null,
    toolCalls: toolCalls.length > 0 ? toolCalls : null,
    isStreaming: false,
    audio: null,
  };
}
