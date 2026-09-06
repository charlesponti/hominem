import type { GenerationStartContext } from './generation-events';
import type { GenerationAdapters } from './generation-interpreter';
import { generate as runGeneration } from './generation-interpreter';
import type {
  GenerationCommand,
  GenerationDeltaEventPayload,
  GenerationEvent,
  GenerationHistoryEventPayload,
  GenerationInput,
  GenerationState,
  GenerationToolCall,
  ToolResult,
} from './generation-machine';
import type { ChatMessageSnapshot } from './generation-schemas';
import { GENERATION_TIMING } from './generation-timing';

// Recovery helpers remain server-private to consumers; applications should
// not construct or reduce generation state directly.
export { createGenerationState, restoreGenerationState } from './generation-machine';
export { reconstructProviderToolCalls } from './generation-machine/provider';
export type ChatModel = GenerationAdapters['provider'];

export type ChatServerModelInput = {
  model: string;
  messages: readonly unknown[];
  tools: readonly unknown[];
  maxTokens?: number;
  reasoning?: unknown;
  requiresToolCall?: boolean;
  requiresConfirmation?: (toolName: string) => boolean;
  onUsage?: (usage: unknown) => void;
};

export type ChatServerToolContext = {
  userId: string;
  generationId: string;
  chatId: string;
  idempotencyKey: string;
};

export type ChatServerToolRegistry = {
  getDefinition: (toolName: string) =>
    | {
        requiresConfirmation?: boolean;
        preview?: (call: GenerationToolCall, context: ChatServerToolContext) => Promise<ToolResult>;
      }
    | undefined;
  execute: (input: {
    call: GenerationToolCall;
    arguments: Record<string, unknown>;
    context: ChatServerToolContext;
  }) => Promise<ToolResult>;
};

export type ChatServerPersistedEvent = {
  generationId: string;
  sequence: number;
  type: string;
  payload: unknown;
  idempotencyKey: string | null;
};

export type ChatServerStore<TEvent extends ChatServerPersistedEvent = ChatServerPersistedEvent> = {
  getEffect?: (input: {
    generationId: string;
    idempotencyKey: string;
    toolName: string;
  }) => Promise<ToolResult | null>;
  saveEffect?: (input: {
    generationId: string;
    idempotencyKey: string;
    toolName: string;
    result: ToolResult;
  }) => Promise<ToolResult>;
  appendEvent: (input: {
    event: GenerationHistoryEventPayload;
    idempotencyKey: string;
  }) => Promise<TEvent | null>;
  saveGeneration: (input: {
    state: GenerationState;
    generationId: string;
    chatId: string;
    userId: string;
    targetAssistantMessageId?: string | null;
  }) => Promise<ChatMessageSnapshot>;
  stopGeneration: (state: GenerationState) => Promise<void>;
};

export type GenerationRunnerOptions<
  TEvent extends ChatServerPersistedEvent = ChatServerPersistedEvent,
> = {
  provider?: (input: ChatServerModelInput) => ChatModel;
  tools?: ChatServerToolRegistry;
  store?: ChatServerStore<TEvent>;
  publisher?: { accept: (event: TEvent) => Promise<void> | void };
  emit?: (event: GenerationDeltaEventPayload) => Promise<void> | void;
  context?: {
    recordCompletion: (input: {
      generationId: string;
      chatId: string;
      userId: string;
      usage: unknown;
    }) => Promise<void> | void;
  };
  isCancelled?: (input: {
    generationId: string;
    chatId: string;
    userId: string;
  }) => boolean | Promise<boolean>;
  effectTimeoutsMs?: Partial<Record<GenerationCommand['type'], number>>;
};

export type ChatServerGenerationInput = {
  generationId: string;
  chatId: string;
  userId: string;
  model: ChatServerModelInput;
  startContext: GenerationStartContext;
  initialInput?: GenerationInput;
  initialState?: GenerationState;
  targetAssistantMessageId?: string | null;
};

export type ChatServerGenerationResult = {
  state: GenerationState;
  toolResults: Map<string, ToolResult>;
  pendingPreview: ToolResult | null;
};

function addUsageTotals(current: unknown, next: unknown): unknown {
  if (!next || typeof next !== 'object') return current;
  if (!current || typeof current !== 'object') return next;
  const previous = current as Record<string, unknown>;
  const incoming = next as Record<string, unknown>;
  const sum = (key: string) =>
    typeof previous[key] === 'number' && typeof incoming[key] === 'number'
      ? previous[key] + incoming[key]
      : incoming[key];
  return {
    ...incoming,
    promptTokens: sum('promptTokens'),
    outputTokens: sum('outputTokens'),
    totalTokens: sum('totalTokens'),
    costUsd:
      typeof previous.costUsd === 'number' && typeof incoming.costUsd === 'number'
        ? previous.costUsd + incoming.costUsd
        : incoming.costUsd,
  };
}

function parseArguments(call: GenerationToolCall): Record<string, unknown> {
  if (!call.arguments) return {};
  try {
    const value: unknown = JSON.parse(call.arguments);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  } catch {
    return {};
  }
}

// Runs ONE generation turn end to end (start -> stream -> commit/fail),
// wiring the pure state machine to real provider/tools/persistence via
// generation-interpreter.ts's adapters. Framework- and transport-agnostic: it
// knows nothing about HTTP, routes, or auth — that's ChatHttpRuntime below,
// which is a thin dispatcher that maps HTTP requests to calls like this
// one's `.generate()`. Concrete instances (real OpenRouter provider, real DB
// store) are assembled in services/api, not here.
export type GenerationRunner<TEvent extends ChatServerPersistedEvent = ChatServerPersistedEvent> = {
  generate: (
    input: ChatServerGenerationInput,
    operation?: GenerationRunnerOptions<TEvent>,
  ) => Promise<ChatServerGenerationResult>;
};

export function createGenerationRunner<
  TEvent extends ChatServerPersistedEvent = ChatServerPersistedEvent,
>(defaults: GenerationRunnerOptions<TEvent> = {}): GenerationRunner<TEvent> {
  return {
    async generate(input, operation = {}) {
      const options = { ...defaults, ...operation };
      if (!options.provider || !options.tools || !options.store) {
        throw new Error('Generation runner requires provider, tools, and store adapters');
      }
      const provider = options.provider;
      const tools = options.tools;
      const store = options.store;
      const toolResults = new Map<string, ToolResult>();
      let pendingPreview: ToolResult | null = null;
      const context = {
        userId: input.userId,
        generationId: input.generationId,
        chatId: input.chatId,
      };
      let usage: unknown = null;

      const model = provider({
        ...input.model,
        requiresConfirmation: (toolName) =>
          tools.getDefinition(toolName)?.requiresConfirmation ?? false,
        onUsage: (next) => {
          usage = addUsageTotals(usage, next);
          input.model.onUsage?.(next);
        },
      });

      const state = await runGeneration({
        generationId: input.generationId,
        startContext: input.startContext,
        initialInput: input.initialInput,
        initialState: input.initialState,
        effectTimeoutsMs: options.effectTimeoutsMs,
        adapters: {
          provider: model,
          tools: {
            execute: async ({ call, idempotencyKey }) => {
              const stored = await store.getEffect?.({
                generationId: input.generationId,
                idempotencyKey,
                toolName: call.name,
              });
              if (stored) {
                toolResults.set(call.id, stored);
                return stored;
              }
              const result = await tools.execute({
                call,
                arguments: parseArguments(call),
                context: { ...context, idempotencyKey },
              });
              toolResults.set(call.id, result);
              return store.saveEffect
                ? store.saveEffect({
                    generationId: input.generationId,
                    idempotencyKey,
                    toolName: call.name,
                    result,
                  })
                : result;
            },
            preview: async ({ call, idempotencyKey }) => {
              const definition = tools.getDefinition(call.name);
              const preview = definition?.preview
                ? await definition.preview(call, { ...context, idempotencyKey })
                : null;
              pendingPreview = preview?.error ? null : preview;
              return (
                preview ?? {
                  callId: call.id,
                  toolName: call.name,
                  content: 'null',
                  error: false,
                }
              );
            },
          },
          events: {
            persist: async (command) => {
              const record = await store.appendEvent({
                event: command.event,
                idempotencyKey: command.idempotencyKey,
              });
              if (record) await options.publisher?.accept(record);
            },
            emit: async (event) => options.emit?.(event),
          },
          generation: {
            save: async (stateToSave) =>
              store.saveGeneration({
                state: stateToSave,
                generationId: input.generationId,
                chatId: input.chatId,
                userId: input.userId,
                targetAssistantMessageId: input.targetAssistantMessageId,
              }),
            stop: (stateToStop) => store.stopGeneration(stateToStop),
          },
          control: {
            isCancelled: () => options.isCancelled?.(context) ?? false,
          },
        },
      });

      if (state.phase === 'committed' && usage) {
        await options.context?.recordCompletion({
          generationId: input.generationId,
          chatId: input.chatId,
          userId: input.userId,
          usage,
        });
      }

      return { state, toolResults, pendingPreview };
    },
  };
}

export function createGenerationSseResponse(
  events: AsyncIterable<GenerationEvent>,
  options: { heartbeatMs?: number } = {},
): Response {
  const encoder = new TextEncoder();
  const heartbeatMs = options.heartbeatMs ?? GENERATION_TIMING.heartbeatMs;
  const iterator = events[Symbol.asyncIterator]();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let pending = iterator.next();
      try {
        while (true) {
          let timer: ReturnType<typeof setTimeout>;
          const heartbeat = new Promise<'heartbeat'>((resolve) => {
            timer = setTimeout(() => resolve('heartbeat'), heartbeatMs);
          });
          const next = await Promise.race([pending, heartbeat]);
          clearTimeout(timer!);
          if (next === 'heartbeat') {
            controller.enqueue(encoder.encode(':heartbeat\n\n'));
            continue;
          }
          if (next.done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }
          const id = next.value.sequence === null ? '' : `id: ${next.value.sequence}\n`;
          controller.enqueue(encoder.encode(`${id}data: ${JSON.stringify(next.value)}\n\n`));
          pending = iterator.next();
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await iterator.return?.();
    },
  });
  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    },
  });
}

export type ChatHttpAuthenticatedUser = { userId: string };

// The HTTP-facing contract createChatHttpHandler dispatches to — NOT the
// same thing as the generation runner above. Each method here corresponds to
// one route (see createChatHttpHandler's routing table) and is expected to be
// implemented by wrapping a generationRunner.generate() call with the specific
// input-resolution and persistence a given endpoint needs (e.g. `regenerate`
// resolves `target` to a stale run before calling `.generate()`); the real
// implementation lives in services/api/src/rpc/routes/chats.generation.ts.
export type ChatHttpRuntime = {
  authenticate: (
    request: Request,
  ) => Promise<ChatHttpAuthenticatedUser | Response> | ChatHttpAuthenticatedUser | Response;
  startChat: (input: { userId: string; body: unknown }) => Promise<AsyncIterable<GenerationEvent>>;
  sendMessage: (input: {
    userId: string;
    chatId: string;
    body: unknown;
  }) => Promise<AsyncIterable<GenerationEvent>>;
  regenerate: (input: {
    userId: string;
    chatId: string;
    target: { messageId: string } | { generationId: string };
    body: unknown;
  }) => Promise<AsyncIterable<GenerationEvent>>;
  respondToToolCall: (input: {
    userId: string;
    chatId: string;
    messageId: string;
    toolCallId: string;
    body: unknown;
  }) => Promise<AsyncIterable<GenerationEvent>>;
  cancel: (input: { userId: string; chatId: string; generationId: string }) => Promise<unknown>;
  getGeneration: (input: {
    userId: string;
    chatId: string;
    generationId: string;
  }) => Promise<unknown>;
  replay: (input: {
    userId: string;
    chatId: string;
    generationId: string;
    afterSequence: number;
  }) => Promise<AsyncIterable<GenerationEvent>>;
};

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error('Request body must be valid JSON');
  }
}

function readCursor(request: Request): number {
  const url = new URL(request.url);
  const value =
    request.headers.get('Last-Event-ID') ?? url.searchParams.get('afterSequence') ?? '0';
  if (!/^\d+$/.test(value)) throw new Error('Invalid generation event cursor');
  const cursor = Number(value);
  if (!Number.isSafeInteger(cursor)) throw new Error('Invalid generation event cursor');
  return cursor;
}

export function createChatHttpHandler(
  runtime: ChatHttpRuntime,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const auth = await runtime.authenticate(request);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const method = request.method.toUpperCase();
    const body = method === 'POST' ? await readJson(request) : undefined;
    try {
      if (
        method === 'POST' &&
        parts[0] === 'api' &&
        parts[1] === 'chats' &&
        parts[2] === 'start-stream'
      ) {
        return createGenerationSseResponse(await runtime.startChat({ userId: auth.userId, body }));
      }
      if (parts[0] !== 'api' || parts[1] !== 'chats' || !parts[2]) {
        return jsonError('Route not found', 404);
      }
      const chatId = parts[2];
      if (method === 'POST' && parts[3] === 'stream') {
        return createGenerationSseResponse(
          await runtime.sendMessage({ userId: auth.userId, chatId, body }),
        );
      }
      if (method === 'POST' && parts[3] === 'messages' && parts[4] && parts[5] === 'regenerate') {
        return createGenerationSseResponse(
          await runtime.regenerate({
            userId: auth.userId,
            chatId,
            target: { messageId: parts[4] },
            body,
          }),
        );
      }
      if (
        method === 'POST' &&
        parts[3] === 'messages' &&
        parts[4] &&
        parts[5] === 'tool-calls' &&
        parts[6] &&
        parts[7] === 'respond'
      ) {
        return createGenerationSseResponse(
          await runtime.respondToToolCall({
            userId: auth.userId,
            chatId,
            messageId: parts[4],
            toolCallId: parts[6],
            body,
          }),
        );
      }
      if (parts[3] !== 'generations' || !parts[4]) return jsonError('Route not found', 404);
      const generationId = parts[4];
      if (method === 'GET' && parts.length === 5) {
        return Response.json(
          await runtime.getGeneration({ userId: auth.userId, chatId, generationId }),
        );
      }
      if (method === 'GET' && parts[5] === 'stream') {
        return createGenerationSseResponse(
          await runtime.replay({
            userId: auth.userId,
            chatId,
            generationId,
            afterSequence: readCursor(request),
          }),
        );
      }
      if (method === 'POST' && parts[5] === 'cancel') {
        return Response.json(await runtime.cancel({ userId: auth.userId, chatId, generationId }));
      }
      if (method === 'POST' && parts[5] === 'regenerate') {
        return createGenerationSseResponse(
          await runtime.regenerate({
            userId: auth.userId,
            chatId,
            target: { generationId },
            body,
          }),
        );
      }
      return jsonError('Route not found', 404);
    } catch (error) {
      if (error instanceof Response) return error;
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        typeof error.statusCode === 'number'
      ) {
        return jsonError(
          error instanceof Error ? error.message : 'Chat request failed',
          error.statusCode,
        );
      }
      return jsonError(error instanceof Error ? error.message : 'Chat request failed', 400);
    }
  };
}
