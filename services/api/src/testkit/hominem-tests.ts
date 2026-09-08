import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { convertSchemaToJsonSchema, type AIUsageMetrics, type ChatFunctionTool } from '@hominem/ai';
import {
  parseGenerationWireEvent,
  type GenerationInput,
  type GenerationEvent,
} from '@hominem/chat';
import {
  createGenerationClientState,
  reduceGenerationClientEvent,
  type GenerationClientState,
} from '@hominem/chat/client';
import type { ChatModel } from '@hominem/chat/server';
import { AIUsageEventRepository } from '@hominem/db/ai';
import { ChatRepository } from '@hominem/db/chats';
import { ChatGenerationRepository } from '@hominem/db/chats';
import { authDb, db } from '@hominem/db/core';
import { Hono } from 'hono';

import type { CapabilityDefinition } from '../application/capability';
import type { ChatGenerationFailureHooks, ChatToolRuntime } from '../chat/chat-generation-types';
import { ChatGenerationService } from '../chat/chat-generation.service';
import type { ChatToolPlan } from '../mcp/chat-tool-adapter';
import type { McpToolResult } from '../mcp/tool-registry';
import type { AppContext, RpcUser } from '../rpc/middleware/auth';
import { apiErrorHandler } from '../rpc/middleware/error';
import {
  createChatGenerationRoutes,
  createChatStartGenerationRoute,
} from '../rpc/routes/chats.$chatId.generation';

export type ScriptedProviderTurn = readonly GenerationInput[];

export type ScriptedProvider = {
  readonly turns: readonly ScriptedProviderTurn[];
  plan?: ChatToolPlan;
  calls: number;
  cursor: number;
  readonly usage: readonly (AIUsageMetrics | null)[];
};

const DEFAULT_TEST_USAGE: AIUsageMetrics = {
  provider: 'openrouter',
  model: 'scripted-model',
  promptTokens: 1,
  outputTokens: 1,
  totalTokens: 2,
  reportedTotalTokens: 2,
  costUsd: 0,
  cachedPromptTokens: null,
  reasoningTokens: null,
};

export function scriptedProvider(
  turns: readonly ScriptedProviderTurn[],
  plan: ChatToolPlan = { capabilities: [], requiresLookup: false, tools: [], usage: null },
  usage: readonly (AIUsageMetrics | null)[] = turns.map(() => DEFAULT_TEST_USAGE),
): ScriptedProvider {
  return {
    turns,
    plan,
    calls: 0,
    cursor: 0,
    usage,
  };
}

export function textTurn(text: string, reasoning?: string): ScriptedProviderTurn {
  return [
    {
      type: 'provider-chunk',
      chunk: { content: text, ...(reasoning ? { reasoning } : {}) },
    },
    { type: 'provider-turn-completed', requiredToolCall: false, confirmationCallIds: [] },
  ];
}

export function fragmentedToolCallTurn(
  name: string,
  id: string,
  argumentFragments: readonly string[],
  options: { requiresConfirmation?: boolean } = {},
): ScriptedProviderTurn {
  return [
    ...argumentFragments.map((argumentsFragment, index) => ({
      type: 'provider-chunk' as const,
      chunk: {
        toolCalls: [
          {
            index: 0,
            ...(index === 0
              ? { id, function: { name, arguments: argumentsFragment } }
              : { function: { arguments: argumentsFragment } }),
          },
        ],
      },
    })),
    {
      type: 'provider-turn-completed',
      requiredToolCall: true,
      confirmationCallIds: options.requiresConfirmation ? [id] : [],
    },
  ];
}

export function multipleToolCallTurn(
  calls: readonly { name: string; id: string; arguments: string }[],
): ScriptedProviderTurn {
  return [
    {
      type: 'provider-chunk',
      chunk: {
        toolCalls: calls.map((call, index) => ({
          index,
          id: call.id,
          function: { name: call.name, arguments: call.arguments },
        })),
      },
    },
    { type: 'provider-turn-completed', requiredToolCall: true, confirmationCallIds: [] },
  ];
}

export function providerFailureTurn(
  message: string,
  options: { transient?: boolean; attempt?: number; maxAttempts?: number } = {},
): ScriptedProviderTurn {
  return [
    {
      type: 'provider-turn-failed',
      message,
      transient: options.transient ?? false,
      attempt: options.attempt ?? 0,
      maxAttempts: options.maxAttempts ?? 2,
    },
  ];
}

class ScriptedChatModel implements ChatModel {
  constructor(
    private readonly script: ScriptedProvider,
    private readonly onUsage?: (usage: AIUsageMetrics | null) => void,
  ) {}

  open() {
    return this.nextTurn();
  }

  retry() {
    return this.nextTurn();
  }

  appendToolResult() {}

  private async *nextTurn(): AsyncIterable<GenerationInput> {
    this.script.calls += 1;
    this.onUsage?.(this.script.usage[this.script.cursor] ?? null);
    const turn = this.script.turns[this.script.cursor++] ?? [];
    for (const input of turn) {
      yield input;
    }
  }
}

export type TestTool = {
  definition: CapabilityDefinition;
  execute: (input: {
    ownerUserId: string;
    input: unknown;
    idempotencyKey?: string;
  }) => Promise<Record<string, unknown> | null>;
};

export type FailurePoint = 'event-append' | 'snapshot-commit' | 'cancellation-commit';

class FailureController {
  private readonly pending = new Map<FailurePoint, { error: Error; after: number }>();

  inject(point: FailurePoint, message = `Injected ${point} failure`, after = 0): void {
    this.pending.set(point, { error: new Error(message), after });
  }

  consume(point: FailurePoint): void {
    const failure = this.pending.get(point);
    if (!failure) return;
    if (failure.after > 0) {
      failure.after -= 1;
      return;
    }
    this.pending.delete(point);
    throw failure.error;
  }
}

export type ChatRouteResult = {
  generationId: string;
  chatId: string | null;
  response: Response;
  events: GenerationEvent[];
  clientState: GenerationClientState;
  doneCount: number;
  durableEvents: GenerationEvent[];
  liveEvents: GenerationEvent[];
};

export type TestEvidenceManifest = {
  schemaVersion: 1;
  scenarioId: string;
  userId: string;
  chatId: string | null;
  correlation: { requestId: string; generationId: string };
  terminalState: string | null;
  durableSequence: number;
  durableEventTypes: string[];
  messageIds: { user: string[]; assistant: string[] };
  toolCallIds: string[];
  toolEffectCount: number;
  artifactPaths: string[];
  duplicateChecks: {
    userMessages: boolean;
    assistantMessages: boolean;
    toolCalls: boolean;
    terminalEvents: boolean;
  };
};

export type TestCleanupReceipt = { userId: string; remainingChats: number };

export type ChatGenerationInput = {
  generationId?: string;
  message: string;
  fileIds?: string[];
  responseLength?: 'short' | 'medium' | 'long';
  responseModality?: 'text' | 'audio';
};

function user(id: string): RpcUser {
  return {
    id,
    email: `${id}@hominem-tests.test`,
    name: 'Hominem Test User',
    emailVerified: true,
    image: null,
    isAdmin: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createToolRuntime(ownerUserId: string, tools: Map<string, TestTool>): ChatToolRuntime {
  return {
    getToolDefinition: (name) => tools.get(name)?.definition,
    callTool: async (_ownerUserId, name, input, context): Promise<McpToolResult> => {
      const tool = tools.get(name);
      if (!tool) throw new Error(`Unknown test tool: ${name}`);
      const output = await tool.execute({
        ownerUserId,
        input: tool.definition.inputSchema.parse(input),
        idempotencyKey: context?.idempotencyKey,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    },
  };
}

async function parseSse(response: Response, generationId: string): Promise<ChatRouteResult> {
  const body = await response.text();
  const doneCount = body.split('\n').filter((line) => line === 'data: [DONE]').length;
  const events = body
    .split('\n')
    .filter((line) => line.startsWith('data: ') && line !== 'data: [DONE]')
    .map((line) => parseGenerationWireEvent(JSON.parse(line.slice('data: '.length))));
  let clientState = createGenerationClientState(generationId);
  for (const event of events) clientState = reduceGenerationClientEvent(clientState, event);
  const accepted = events.find(
    (event) => event.sequence !== null && event.payload.type === 'generation.accepted',
  );
  return {
    generationId,
    chatId:
      accepted && 'chat' in accepted.payload && accepted.payload.chat
        ? accepted.payload.chat.id
        : null,
    response,
    events,
    clientState,
    doneCount,
    durableEvents: events.filter((event) => event.sequence !== null),
    liveEvents: events.filter((event) => event.sequence === null),
  };
}

export class HominemTests {
  readonly userId: string;
  readonly tools = {
    add: (tool: TestTool) => {
      this.testTools.set(tool.definition.name, tool);
      this.provider.plan = {
        ...(this.provider.plan ?? { capabilities: [], requiresLookup: false, usage: null }),
        capabilities: ['memory'],
        requiresLookup: true,
        tools: [
          ...(this.provider.plan?.tools ?? []),
          {
            type: 'function',
            function: {
              name: tool.definition.name,
              description: tool.definition.description,
              parameters: convertSchemaToJsonSchema(tool.definition.inputSchema),
            },
          } satisfies ChatFunctionTool,
        ],
      };
    },
  };
  readonly chat = {
    start: (input: { generationId?: string; title: string; message: string }) =>
      this.request('/api/chats/start-stream', {
        generationId: input.generationId ?? randomUUID(),
        title: input.title,
        message: input.message,
      }),
    send: (chatId: string, input: ChatGenerationInput) =>
      this.request(`/api/chats/${chatId}/stream`, {
        generationId: input.generationId ?? randomUUID(),
        message: input.message,
        fileIds: input.fileIds ?? [],
        responseLength: input.responseLength,
        responseModality: input.responseModality,
      }),
    retry: (
      chatId: string,
      failedGenerationId: string,
      input: { generationId?: string; responseLength?: 'short' | 'medium' | 'long' },
    ) =>
      this.request(`/api/chats/${chatId}/generations/${failedGenerationId}/regenerate`, {
        generationId: input.generationId ?? randomUUID(),
        responseLength: input.responseLength,
      }),
    regenerate: (chatId: string, messageId: string, input: { generationId?: string }) =>
      this.request(`/api/chats/${chatId}/messages/${messageId}/regenerate`, {
        generationId: input.generationId ?? randomUUID(),
      }),
    respondToConfirmation: (
      chatId: string,
      messageId: string,
      toolCallId: string,
      input: { approved: boolean; responseLength?: 'short' | 'medium' | 'long' },
    ) =>
      this.request(
        `/api/chats/${chatId}/messages/${messageId}/tool-calls/${toolCallId}/respond`,
        { approved: input.approved, responseLength: input.responseLength },
        'POST',
        async () =>
          (
            await ChatRepository.getAwaitingGenerationRunForAssistantMessage(
              db,
              chatId,
              messageId,
              this.userId,
            )
          )?.id ?? null,
      ),
    replay: (chatId: string, generationId: string, afterSequence = 0) =>
      this.request(
        `/api/chats/${chatId}/generations/${generationId}/stream?afterSequence=${afterSequence}`,
        undefined,
        'GET',
      ),
    cancel: async (chatId: string, generationId: string) => {
      const response = await this.app.request(
        `/api/chats/${chatId}/generations/${generationId}/cancel`,
        { method: 'POST' },
      );
      return { response, run: await response.json() };
    },
  };

  readonly failures = {
    inject: (point: FailurePoint, message?: string, after?: number) =>
      this.failureController.inject(point, message, after),
  };

  private readonly testTools = new Map<string, TestTool>();
  private readonly failureController = new FailureController();
  private readonly app: Hono<AppContext>;

  private constructor(private readonly provider: ScriptedProvider) {
    this.userId = randomUUID();
    const currentUser = user(this.userId);
    const failureHooks: ChatGenerationFailureHooks = {
      beforeEventAppend: () => this.failureController.consume('event-append'),
      beforeSnapshotCommit: () => this.failureController.consume('snapshot-commit'),
      beforeCancellationCommit: () => this.failureController.consume('cancellation-commit'),
    };
    const service = new ChatGenerationService({
      modelFactory: (input) => new ScriptedChatModel(provider, input.onUsage),
      planChatTools: async () =>
        provider.plan ?? { capabilities: [], requiresLookup: false, tools: [], usage: null },
      toolRuntime: createToolRuntime(this.userId, this.testTools),
      failureHooks,
      embeddingQueue: { add: async () => undefined },
    });
    this.app = new Hono<AppContext>()
      .onError(apiErrorHandler)
      .use('*', async (c, next) => {
        c.set('auth', {
          user: currentUser,
          userId: this.userId,
          credential: 'session',
          scopes: [],
        });
        await next();
      })
      .route('/api/chats/start-stream', createChatStartGenerationRoute(service))
      .route('/api/chats/:id', createChatGenerationRoutes(service));
  }

  static async create(options: { provider: ScriptedProvider }): Promise<HominemTests> {
    const test = new HominemTests(options.provider);
    await authDb
      .insertInto('user')
      .values({
        id: test.userId,
        name: 'Hominem Test User',
        email: `${test.userId}@hominem-tests.test`,
      })
      .execute();
    return test;
  }

  private async request(
    path: string,
    body?: Record<string, unknown>,
    method: 'GET' | 'POST' = 'POST',
    generationId?: string | (() => Promise<string | null>),
  ): Promise<ChatRouteResult> {
    const response = await this.app.request(path, {
      method,
      headers: { 'content-type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const resolvedGenerationId =
      typeof body?.generationId === 'string'
        ? body.generationId
        : (path.match(/generations\/([^/]+)/)?.[1] ??
          (typeof generationId === 'function' ? await generationId() : generationId));
    if (!resolvedGenerationId) throw new Error(`Generation ID is required for ${path}`);
    return parseSse(response, resolvedGenerationId);
  }

  async inspect(generationId: string) {
    const run = await ChatRepository.getGenerationRunById(db, generationId, this.userId);
    return {
      run,
      events: await ChatGenerationRepository.listEvents(db, generationId, this.userId),
      messages: run ? await ChatRepository.getMessages(db, run.chatId) : [],
      toolEffects: run
        ? await ChatGenerationRepository.listToolEffects(db, {
            generationId,
            ownerUserId: this.userId,
          })
        : [],
      usage: await AIUsageEventRepository.getSummary(db, { userId: this.userId }),
    };
  }

  async evidence(
    generationId: string,
    options: { scenarioId: string; chatId?: string | null; artifactPaths?: string[] },
  ): Promise<TestEvidenceManifest> {
    const inspected = await this.inspect(generationId);
    const terminalTypes = new Set([
      'generation.committed',
      'generation.cancelled',
      'generation.failed',
    ]);
    const terminalEvents = inspected.events.filter((event) => terminalTypes.has(event.type));
    const userMessages = inspected.messages.filter((message) => message.role === 'user');
    const assistantMessages = inspected.messages.filter((message) => message.role === 'assistant');
    const toolCallIds = assistantMessages.flatMap(
      (message) => message.toolCalls?.map((call) => call.toolCallId) ?? [],
    );

    return {
      schemaVersion: 1,
      scenarioId: options.scenarioId,
      userId: this.userId,
      chatId: options.chatId ?? inspected.run?.chatId ?? null,
      correlation: { requestId: generationId, generationId },
      terminalState: inspected.run?.status ?? null,
      durableSequence: inspected.events.at(-1)?.sequence ?? 0,
      durableEventTypes: inspected.events.map((event) => event.type),
      messageIds: {
        user: userMessages.map((message) => message.id),
        assistant: assistantMessages.map((message) => message.id),
      },
      toolCallIds,
      toolEffectCount: inspected.toolEffects.length,
      artifactPaths: options.artifactPaths ?? [],
      duplicateChecks: {
        userMessages:
          new Set(userMessages.map((message) => message.id)).size === userMessages.length,
        assistantMessages:
          new Set(assistantMessages.map((message) => message.id)).size === assistantMessages.length,
        toolCalls: new Set(toolCallIds).size === toolCallIds.length,
        terminalEvents: terminalEvents.length <= 1,
      },
    };
  }

  async writeEvidence(
    generationId: string,
    options: { scenarioId: string; outputPath: string; chatId?: string | null },
  ): Promise<TestEvidenceManifest> {
    const manifest = await this.evidence(generationId, {
      scenarioId: options.scenarioId,
      chatId: options.chatId,
      artifactPaths: [options.outputPath],
    });
    await mkdir(dirname(options.outputPath), { recursive: true });
    await writeFile(options.outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return manifest;
  }

  async close(): Promise<TestCleanupReceipt> {
    await authDb.deleteFrom('user').where('id', '=', this.userId).execute();
    return {
      userId: this.userId,
      remainingChats: (await ChatRepository.listForUser(db, this.userId)).chats.length,
    };
  }
}
