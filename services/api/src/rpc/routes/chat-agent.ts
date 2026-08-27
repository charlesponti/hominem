import { getChatCompletionUsage, type ChatMessages } from '@hominem/ai';
import type { ChatMessageFileRecord, ChatMessageToolCallRecord } from '@hominem/db';
import { ChatRepository, db } from '@hominem/db';
import {
  chat,
  maxIterations,
  toolDefinition,
  type AnyTextAdapter,
  type AnyServerTool,
  type ChatMiddleware,
  type ModelMessage,
  type RunAgentResumeItem,
} from '@tanstack/ai';
import { openRouterText } from '@tanstack/ai-openrouter';

import { recordAIUsageEvent } from '../../application/ai-usage.service';
import { planChatTools } from '../../mcp/llm-tools';
import { ensureMcpToolsRegistered } from '../../mcp/register-tools';
import { callTool, listTools } from '../../mcp/tools';
import { buildChatSystemPrompt } from '../prompts';
import { enqueueAgentChatEmbedding, synthesizeAgentReplyAudio } from './chat-agent-lifecycle';
import { withChatPersistence } from './chat-agent-persistence';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const maxCompletionTokens = { short: 250, medium: 1600, long: 6000 } as const;

function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const value = part as Record<string, unknown>;
      return typeof value.text === 'string' ? value.text : '';
    })
    .join('');
}

function productProjection(input: {
  ownerUserId: string;
  targetAssistantMessageId?: string;
  inputFiles?: ChatMessageFileRecord[];
  responseModality?: 'text' | 'audio';
}): ChatMiddleware {
  const toolCalls = new Map<string, ChatMessageToolCallRecord>();
  let reasoningText = '';
  return {
    name: 'hominem-product-projection',
    onChunk(_ctx, chunk) {
      const value = asRecord(chunk);
      const chunkType = typeof value.type === 'string' ? value.type : '';
      const delta = typeof value.delta === 'string' ? value.delta : '';
      if (chunkType.includes('REASONING') && delta) reasoningText += delta;
      const toolCallId =
        typeof value.toolCallId === 'string'
          ? value.toolCallId
          : typeof asRecord(value.toolCall).id === 'string'
            ? (asRecord(value.toolCall).id as string)
            : null;
      const customValue = asRecord(value.value);
      if (
        chunkType === 'CUSTOM' &&
        value.name === 'approval-requested' &&
        typeof customValue.toolCallId === 'string'
      ) {
        const existing = toolCalls.get(customValue.toolCallId);
        if (existing) {
          toolCalls.set(existing.toolCallId, {
            ...existing,
            status: 'pending',
            preview: (customValue.preview as Record<string, unknown> | null) ?? null,
          });
        }
      }
      if (toolCallId && (chunkType.includes('TOOL_CALL') || chunkType.includes('TOOL_RESULT'))) {
        const previous = toolCalls.get(toolCallId) ?? {
          toolCallId,
          toolName:
            typeof value.toolName === 'string'
              ? value.toolName
              : typeof value.name === 'string'
                ? value.name
                : 'tool',
          type: 'tool-call' as const,
          args: (() => {
            if (value.input && typeof value.input === 'object') return asRecord(value.input);
            if (typeof value.arguments !== 'string') return {};
            try {
              return asRecord(JSON.parse(value.arguments));
            } catch {
              return {};
            }
          })(),
          status: 'running' as const,
        };
        toolCalls.set(toolCallId, {
          ...previous,
          ...(chunkType.includes('RESULT')
            ? { output: value.result ?? value.output, status: 'completed' as const }
            : {}),
          ...(chunkType.includes('ERROR') ? { status: 'failed' as const } : {}),
        });
      }
      return;
    },
    async onFinish(ctx, info) {
      const messages = ctx.messages;
      const userMessage = [...messages].reverse().find((message) => message.role === 'user');
      const userContent = messageText(userMessage?.content);
      const assistantContent = info.content.trim();
      if (!userContent || !assistantContent) return;

      await recordAIUsageEvent({
        eventId: ctx.runId,
        userId: input.ownerUserId,
        feature: 'chat_stream',
        operation: 'chat_completion',
        model: ctx.model,
        usage: info.usage
          ? getChatCompletionUsage({ model: ctx.model, usage: info.usage } as never)
          : null,
        durationMs: info.duration,
        metadata: { threadId: ctx.threadId, runId: ctx.runId },
      }).catch(() => undefined);

      const audioFile =
        input.responseModality === 'audio'
          ? await synthesizeAgentReplyAudio(input.ownerUserId, assistantContent)
          : null;
      const projectedToolCalls = [...toolCalls.values()];
      if (input.targetAssistantMessageId) {
        await ChatRepository.replaceAssistantMessageContent(
          db,
          ctx.threadId,
          input.targetAssistantMessageId,
          assistantContent,
          {
            reasoning: reasoningText || null,
            toolCalls: projectedToolCalls.length > 0 ? projectedToolCalls : null,
            files: audioFile ? [audioFile] : null,
          },
        );
        await enqueueAgentChatEmbedding(input.ownerUserId, ctx.threadId);
        return;
      }

      await db.transaction().execute(async (trx) => {
        const latest = await trx
          .selectFrom('app.chatMessages')
          .select(['id', 'role', 'content'])
          .where('chatId', '=', ctx.threadId)
          .orderBy('createdat', 'desc')
          .orderBy('id', 'desc')
          .limit(2)
          .execute();
        const latestUser = latest.find((message) => message.role === 'user');
        if (!latestUser || latestUser.content !== userContent) {
          await ChatRepository.insertMessage(trx, {
            chatId: ctx.threadId,
            authorUserId: input.ownerUserId,
            role: 'user',
            content: userContent,
          });
        }

        const latestAssistant = latest.find((message) => message.role === 'assistant');
        if (latestAssistant?.content === assistantContent) return;
        await ChatRepository.insertMessage(trx, {
          chatId: ctx.threadId,
          authorUserId: input.ownerUserId,
          role: 'assistant',
          content: assistantContent,
          files: audioFile ? [audioFile] : input.inputFiles?.length ? input.inputFiles : null,
          reasoning: reasoningText || null,
          toolCalls: projectedToolCalls.length > 0 ? projectedToolCalls : null,
          parentMessageId: latestUser?.id ?? null,
        });
      });
      await enqueueAgentChatEmbedding(input.ownerUserId, ctx.threadId);
    },
  };
}

function approvalPreviewMiddleware(ownerUserId: string): ChatMiddleware {
  return {
    name: 'hominem-approval-preview',
    async onChunk(_ctx, chunk) {
      if (chunk.type !== 'CUSTOM' || chunk.name !== 'approval-requested') return;
      const value = asRecord(chunk.value);
      const toolName = typeof value.toolName === 'string' ? value.toolName : null;
      if (!toolName) return;
      const definition = listTools().find((tool) => tool.name === toolName);
      if (!definition?.preview) return;
      const preview = await definition
        .preview(ownerUserId, asRecord(value.input))
        .catch(() => null);
      return { ...chunk, value: { ...value, ...(preview ? { preview } : {}) } };
    },
  };
}

/**
 * Converts Hominem's MCP registry into TanStack server tools. The user id is
 * intentionally captured by the request, so a model can never choose the
 * principal used to execute a tool.
 */
export async function getTanStackChatTools(userId: string): Promise<AnyServerTool[]> {
  await ensureMcpToolsRegistered();
  const readOnlyCalls = new Map<string, Promise<unknown>>();

  return listTools().map((definition) => {
    const tool = toolDefinition({
      name: definition.name,
      description: definition.description,
      inputSchema: definition.inputSchema,
      outputSchema: definition.outputSchema,
      needsApproval: definition.requiresConfirmation === true,
    });

    return tool.server(async (input) => {
      const execute = async () => {
        const result = await callTool(userId, definition.name, asRecord(input));
        return result.structuredContent ?? result.content[0]?.text ?? null;
      };
      if (!definition.readOnly) return execute();
      const key = `${definition.name}:${JSON.stringify(input)}`;
      const existing = readOnlyCalls.get(key);
      if (existing) return existing;
      const call = execute();
      readOnlyCalls.set(key, call);
      try {
        return await call;
      } catch (error) {
        readOnlyCalls.delete(key);
        throw error;
      }
    });
  });
}

export async function createTanStackChatStream(input: {
  userId: string;
  model: string;
  threadId: string;
  runId: string;
  messages: ChatMessages[];
  resume?: RunAgentResumeItem[];
  responseLength?: 'short' | 'medium' | 'long';
  targetAssistantMessageId?: string;
  inputFiles?: ChatMessageFileRecord[];
  responseModality?: 'text' | 'audio';
}) {
  const [allTools, toolPlan] = await Promise.all([
    getTanStackChatTools(input.userId),
    planChatTools({ model: input.model, messages: input.messages }),
  ]);
  const allowedNames = new Set(
    toolPlan.tools.flatMap((tool) => ('function' in tool ? [tool.function.name] : [])),
  );
  const tools = allTools.filter((tool) => allowedNames.has(tool.name));

  return chat({
    adapter: openRouterText(input.model as never) as unknown as AnyTextAdapter,
    messages: input.messages as unknown as ModelMessage[],
    systemPrompts: [buildChatSystemPrompt(input.responseLength)],
    tools,
    threadId: input.threadId,
    runId: input.runId,
    ...(input.resume ? { resume: input.resume } : {}),
    agentLoopStrategy: maxIterations(4),
    modelOptions: {
      reasoning: { effort: 'none' },
      ...(input.responseLength
        ? { maxCompletionTokens: maxCompletionTokens[input.responseLength] }
        : {}),
    } as never,
    middleware: [
      approvalPreviewMiddleware(input.userId),
      withChatPersistence(input.userId),
      productProjection({
        ownerUserId: input.userId,
        targetAssistantMessageId: input.targetAssistantMessageId,
        inputFiles: input.inputFiles,
        responseModality: input.responseModality,
      }),
    ],
  });
}
