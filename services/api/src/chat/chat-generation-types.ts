import type { AIUsageMetrics, ChatFunctionTool, ChatMessages, ChatRequest } from '@hominem/ai';
import type {
  ChatSnapshot,
  GenerationHistoryEventPayload,
  GenerationInput,
  GenerationState,
} from '@hominem/chat';
import type { ChatModel } from '@hominem/chat/server';
import type { ChatGenerationRunRecord, ChatMessageToolCallRecord } from '@hominem/db/chats';
import type { embeddingQueue } from '@hominem/queues';

import type { planChatTools } from '../mcp/chat-tool-adapter';
import type { callTool, getToolDefinition } from '../mcp/tool-registry';

export type ChatToolRuntime = {
  callTool: typeof callTool;
  getToolDefinition: typeof getToolDefinition;
};

export type ChatGenerationModelFactory = (input: {
  model: string;
  messages: ChatMessages[];
  tools: ChatFunctionTool[];
  maxTokens?: number;
  reasoning?: ChatRequest['reasoning'];
  requiresToolCall?: boolean;
  requiresConfirmation?: (toolName: string) => boolean;
  // Missing usage must not invalidate otherwise valid generation semantics.
  onUsage?: (usage: AIUsageMetrics | null) => void;
}) => ChatModel;

export type ChatGenerationFailureHooks = {
  beforeEventAppend?: (event: GenerationHistoryEventPayload) => void | Promise<void>;
  beforeSnapshotCommit?: () => void | Promise<void>;
  beforeCancellationCommit?: () => void | Promise<void>;
};

export interface GenerationEngineInput {
  userId: string;
  model: string;
  messages: ChatMessages[];
  tools: ChatFunctionTool[];
  maxTokens?: number;
  reasoning?: ChatRequest['reasoning'];
  maxIterations?: number;
  requiresToolCall?: boolean;
  toolRuntime?: ChatToolRuntime;
  modelFactory?: ChatGenerationModelFactory;
  initialState?: GenerationState;
  initialInput?: GenerationInput;
  context?: {
    recordCompletion: (input: {
      generationId: string;
      chatId: string;
      userId: string;
      usage: AIUsageMetrics;
    }) => Promise<void> | void;
  };
}

export interface GenerationEngineResult {
  assistantText: string;
  reasoningText: string | null;
  toolCallRecords: ChatMessageToolCallRecord[];
  usage: AIUsageMetrics | null;
  pendingToolCall: {
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    preview: Record<string, unknown> | null;
  } | null;
}

export type ChatGenerationDependencies = {
  modelFactory?: ChatGenerationModelFactory;
  toolRuntime?: ChatToolRuntime;
  planChatTools?: typeof planChatTools;
  failureHooks?: ChatGenerationFailureHooks;
  embeddingQueue?: {
    add: (...args: Parameters<typeof embeddingQueue.add>) => Promise<unknown>;
  };
};

type PreparedGeneration = {
  userId: string;
  generationId: string;
  chatId: string;
  kind: 'send' | 'start';
  messages: ChatMessages[];
  tools: ChatFunctionTool[];
  model: string;
  reasoning?: ChatRequest['reasoning'];
  requiresToolCall?: boolean;
  maxTokens?: number;
  responseLength?: 'short' | 'medium' | 'long';
  responseModality?: 'text' | 'audio';
  targetAssistantMessageId?: string | null;
  userMessageId?: string | null;
  // Set by regenerate: the generation/message this one supersedes outright,
  // deleted once this one commits. See redoGeneration.
  staleGenerationId?: string | null;
  staleAssistantMessageId?: string | null;
  // The chat row, when the caller already fetched (or just created) it —
  // lets executeGeneration skip its own getOwnedOrThrow round trip. Falls
  // back to fetching by chatId/userId when omitted, so callers that only
  // have a chatId (e.g. a direct service.send() call) still work.
  chat?: ChatSnapshot;
};

export type GenerationStartInput = Omit<PreparedGeneration, 'kind'> & {
  kind: 'send' | 'start';
  resume?: boolean;
  initialState?: GenerationState;
  initialInput?: GenerationInput;
  confirmation?: {
    messageId: string;
    toolCallId: string;
    approved: boolean;
  };
};

export type SendGenerationInput = Omit<GenerationStartInput, 'kind'> & { kind?: 'send' };
export type StartGenerationInput = Omit<GenerationStartInput, 'kind'> & { kind?: 'start' };

export type ReplayInput = {
  generationId: string;
  ownerUserId: string;
  afterSequence?: number;
  terminal?: boolean;
};

export type CancelInput = {
  chatId: string;
  generationId: string;
  ownerUserId: string;
};

export type GenerationRecoveryResult = {
  generationId: string;
  chatId: string;
  phase: ChatGenerationRunRecord['status'];
  lastDurableSequence: number;
  disposition: 'terminal' | 'awaiting_confirmation' | 'resume_required';
  mayExecuteEffect: boolean;
};

export type GenerationLookupInput = {
  chatId: string;
  generationId: string;
  ownerUserId: string;
};

export type ConfirmationMessageInput = {
  userId: string;
  chatId: string;
  messageId: string;
  toolCallId: string;
  approved: boolean;
  responseLength?: 'short' | 'medium' | 'long';
};

export type SendMessageInput = {
  userId: string;
  generationId: string;
  chatId: string;
  message: string;
  fileIds: string[];
  responseLength?: 'short' | 'medium' | 'long';
  responseModality?: 'text' | 'audio';
};

export type StartMessageInput = Omit<SendMessageInput, 'chatId'> & { title: string };

// Redo the most recent attempt at a turn — whether it committed a reply
// worth replacing (messageId) or failed before producing one
// (failedGenerationId). Both are the same operation: rerun the same history
// and supersede the attempt being redone.
type RegenerateInputBase = {
  userId: string;
  generationId: string;
  chatId: string;
  responseLength?: 'short' | 'medium' | 'long';
};

export type RegenerateInput =
  | (RegenerateInputBase & { messageId: string })
  | (RegenerateInputBase & { failedGenerationId: string });
