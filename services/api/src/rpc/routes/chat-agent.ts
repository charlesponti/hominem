import type { ChatMessages } from '@hominem/ai';
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

import { planChatTools } from '../../mcp/llm-tools';
import { ensureMcpToolsRegistered } from '../../mcp/register-tools';
import { callTool, listTools } from '../../mcp/tools';
import { buildChatSystemPrompt } from '../prompts';
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

function productProjection(ownerUserId: string, targetAssistantMessageId?: string): ChatMiddleware {
  return {
    name: 'hominem-product-projection',
    async onFinish(ctx, info) {
      const messages = ctx.messages;
      const userMessage = [...messages].reverse().find((message) => message.role === 'user');
      const userContent = messageText(userMessage?.content);
      const assistantContent = info.content.trim();
      if (!userContent || !assistantContent) return;

      if (targetAssistantMessageId) {
        await ChatRepository.replaceAssistantMessageContent(
          db,
          ctx.threadId,
          targetAssistantMessageId,
          assistantContent,
          { reasoning: null, toolCalls: null },
        );
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
            authorUserId: ownerUserId,
            role: 'user',
            content: userContent,
          });
        }

        const latestAssistant = latest.find((message) => message.role === 'assistant');
        if (latestAssistant?.content === assistantContent) return;
        await ChatRepository.insertMessage(trx, {
          chatId: ctx.threadId,
          authorUserId: ownerUserId,
          role: 'assistant',
          content: assistantContent,
          reasoning: null,
          parentMessageId: latestUser?.id ?? null,
        });
      });
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
      productProjection(input.userId, input.targetAssistantMessageId),
    ],
  });
}
