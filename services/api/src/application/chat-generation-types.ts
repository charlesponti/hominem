import type { AIUsageMetrics, ChatFunctionTool, ChatMessages, ChatRequest } from '@hominem/ai';
import type {
  GenerationHistoryEventPayload,
  GenerationInput,
  GenerationState,
} from '@hominem/chat';
import type { ChatModel } from '@hominem/chat/server';
import type { ChatMessageToolCallRecord } from '@hominem/db';

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
