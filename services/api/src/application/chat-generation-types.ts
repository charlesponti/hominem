import type { AIUsageMetrics, ChatFunctionTool, ChatMessages, ChatRequest } from '@hominem/ai';
import type { ChatMessageToolCallRecord } from '@hominem/db';

import type { McpToolResult } from '../mcp/tool-registry';
import type { CapabilityDefinition } from './capability';

/** Legacy compatibility transport for the current route-owned stream. */
export type ChatGenerationLiveEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'reasoning-delta'; text: string }
  | {
      type: 'tool-step';
      toolCallId: string;
      toolName: string;
      status: 'requested' | 'running' | 'completed' | 'failed' | 'reused';
    }
  | { type: 'phase'; phase: 'generating' };

export type ChatToolRuntime = {
  callTool: (
    ownerUserId: string,
    name: string,
    input: Record<string, unknown>,
    context?: { idempotencyKey?: string },
  ) => Promise<McpToolResult>;
  getToolDefinition: (name: string) => CapabilityDefinition | undefined;
};

export interface RunCompletionWithToolsInput {
  userId: string;
  model: string;
  messages: ChatMessages[];
  tools: ChatFunctionTool[];
  maxTokens?: number;
  reasoning?: ChatRequest['reasoning'];
  maxIterations?: number;
  requiresToolCall?: boolean;
  toolRuntime?: ChatToolRuntime;
  onEvent?: (event: ChatGenerationLiveEvent) => Promise<void> | void;
}

export interface RunCompletionWithToolsResult {
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
