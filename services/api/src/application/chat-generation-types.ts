import type { AIUsageMetrics, ChatFunctionTool, ChatMessages, ChatRequest } from '@hominem/ai';
import type { GenerationInput, GenerationState } from '@hominem/chat';
import type { ChatMessageToolCallRecord } from '@hominem/db';

import type { callTool, getToolDefinition } from '../mcp/tool-registry';

export type ChatToolRuntime = {
  callTool: typeof callTool;
  getToolDefinition: typeof getToolDefinition;
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
  initialState?: GenerationState;
  initialInput?: GenerationInput;
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
