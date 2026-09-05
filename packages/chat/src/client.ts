import type { ChatClientTransport } from './client-transport-fetch';
import type { GenerationClientInputEvent, GenerationClientState } from './generation-client';
import { createGenerationClientState, reduceGenerationClientEvent } from './generation-client';
import type { GenerationEvent } from './generation-machine';
import { createGenerationEventDeduplicator } from './generation-schemas';
import { GENERATION_TIMING } from './generation-timing';
import { createSseDecoder, finishSse, pushSseChunk } from './sse';

export {
  createGenerationClientState,
  parseGenerationClientCheckpoint,
  reduceGenerationClientEvent,
  toGenerationClientCheckpoint,
} from './generation-client';
export type {
  GenerationClientErrorEvent,
  GenerationClientInputEvent,
  GenerationClientState,
  GenerationClientToolStep,
} from './generation-client';

export type ChatCheckpointStore = {
  get: (
    generationId: string,
  ) => Promise<GenerationClientState | null> | GenerationClientState | null;
  set: (state: GenerationClientState) => Promise<void> | void;
  remove?: (generationId: string) => Promise<void> | void;
};

export type ChatClientOptions = {
  baseUrl: string;
  transport: ChatClientTransport;
  headers?: () => RequestInit['headers'] | Promise<RequestInit['headers']>;
  checkpointStore?: ChatCheckpointStore;
  createId?: () => string;
};

export type ChatGenerationController = {
  readonly state: GenerationClientState;
  readonly signal: AbortSignal;
  readonly done: Promise<GenerationClientState>;
  subscribe: (
    listener: (state: GenerationClientState, event: GenerationClientInputEvent) => void,
  ) => () => void;
  start: (input: {
    path: string;
    body: unknown;
    generationId?: string;
    replayPath?: (generationId: string, afterSequence: number) => string;
  }) => Promise<GenerationClientState>;
  resume: (input: { path: string; generationId: string }) => Promise<GenerationClientState>;
  cancel: () => void;
};

export type ChatMessageInput = {
  chatId: string;
  generationId?: string;
  message: string;
  fileIds?: readonly string[];
  responseLength?: 'short' | 'medium' | 'long';
  responseModality?: 'text' | 'audio';
};

export class SseIdleTimeoutError extends Error {
  constructor(readonly idleMs: number) {
    super(`No SSE data received for ${idleMs}ms`);
    this.name = 'SseIdleTimeoutError';
  }
}

type ChatHttpError = Error & { status: number };

function isChatHttpError(error: unknown): error is ChatHttpError {
  return error instanceof Error && 'status' in error && typeof error.status === 'number';
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

function chatRequestError(response: Response): ChatHttpError {
  return Object.assign(new Error(`Chat request failed: HTTP ${response.status}`), {
    status: response.status,
  });
}

type StreamReadResult<T> = { done: true; value?: T } | { done: false; value: T };

export async function consumeSseResponse(
  response: Response,
  onEvent: (event: GenerationEvent) => void,
  onDone?: () => void,
  options?: {
    deduplicateEvent?: (event: GenerationEvent) => GenerationEvent | null;
    parseEvent?: (input: unknown) => GenerationEvent;
    onDurableSequence?: (sequence: number) => void;
    idleTimeoutMs?: number;
  },
): Promise<void> {
  if (!response.body) throw new Error('No response body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const deduplicate = options?.deduplicateEvent ?? createGenerationEventDeduplicator();
  const idleMs = options?.idleTimeoutMs ?? GENERATION_TIMING.clientIdleMs;
  let sseState = createSseDecoder();
  const parse = options?.parseEvent ?? ((data: string) => JSON.parse(data) as GenerationEvent);
  const process = (outputs: ReturnType<typeof pushSseChunk<GenerationEvent>>['outputs']) => {
    for (const output of outputs) {
      if (output.kind === 'done') onDone?.();
      if (output.kind === 'event') {
        const event = deduplicate(output.event);
        if (event) {
          if (event.sequence !== null) options?.onDurableSequence?.(event.sequence);
          onEvent(event);
        }
      }
    }
  };
  while (true) {
    const step = await new Promise<StreamReadResult<Uint8Array>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new SseIdleTimeoutError(idleMs)), idleMs);
      reader.read().then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    }).catch(async (error) => {
      await reader.cancel().catch(() => undefined);
      throw error;
    });
    if (step.done) break;
    const result = pushSseChunk<GenerationEvent>(
      sseState,
      decoder.decode(step.value, { stream: true }),
      parse,
    );
    sseState = result.state;
    process(result.outputs);
  }
  const trailing = pushSseChunk<GenerationEvent>(sseState, decoder.decode(), parse);
  process(trailing.outputs);
  process(finishSse<GenerationEvent>(trailing.state, parse).outputs);
}

function defaultId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export class ChatClient {
  constructor(private readonly options: ChatClientOptions) {}

  send(input: ChatMessageInput): ChatGenerationController {
    return this.createGenerationWith({
      path: `/api/chats/${input.chatId}/stream`,
      body: input,
      replayPath: (generationId, afterSequence) =>
        `/api/chats/${input.chatId}/generations/${generationId}/stream?afterSequence=${afterSequence}`,
    });
  }

  start(input: {
    generationId?: string;
    title: string;
    message: string;
    fileIds?: readonly string[];
    responseLength?: 'short' | 'medium' | 'long';
  }): ChatGenerationController {
    return this.createGenerationWith({ path: '/api/chats/start-stream', body: input });
  }

  regenerate(input: {
    chatId: string;
    messageId: string;
    body: Record<string, unknown>;
  }): ChatGenerationController {
    return this.createGenerationWith({
      generationId:
        typeof input.body.generationId === 'string' ? input.body.generationId : undefined,
      path: `/api/chats/${input.chatId}/messages/${input.messageId}/regenerate`,
      body: input.body,
      replayPath: (generationId, afterSequence) =>
        `/api/chats/${input.chatId}/generations/${generationId}/stream?afterSequence=${afterSequence}`,
    });
  }

  retry(input: {
    chatId: string;
    generationId: string;
    body: Record<string, unknown>;
  }): ChatGenerationController {
    return this.createGenerationWith({
      generationId:
        typeof input.body.generationId === 'string' ? input.body.generationId : undefined,
      path: `/api/chats/${input.chatId}/generations/${input.generationId}/retry`,
      body: input.body,
      replayPath: (generationId, afterSequence) =>
        `/api/chats/${input.chatId}/generations/${generationId}/stream?afterSequence=${afterSequence}`,
    });
  }

  respondToToolCall(input: {
    chatId: string;
    messageId: string;
    toolCallId: string;
    body: Record<string, unknown>;
  }): ChatGenerationController {
    return this.createGenerationWith({
      generationId:
        typeof input.body.generationId === 'string' ? input.body.generationId : undefined,
      path: `/api/chats/${input.chatId}/messages/${input.messageId}/tool-calls/${input.toolCallId}/respond`,
      body: input.body,
      replayPath: (generationId, afterSequence) =>
        `/api/chats/${input.chatId}/generations/${generationId}/stream?afterSequence=${afterSequence}`,
    });
  }

  resumeGeneration(input: { chatId: string; generationId: string }): ChatGenerationController {
    const generation = this.createGeneration(input.generationId);
    void generation
      .resume({
        path: `/api/chats/${input.chatId}/generations/${input.generationId}/stream`,
        generationId: input.generationId,
      })
      .catch(() => undefined);
    return generation;
  }

  async cancel(input: { chatId: string; generationId: string }): Promise<Response> {
    const headers = new Headers(await this.options.headers?.());
    return this.options.transport.request({
      url: `${this.options.baseUrl}/api/chats/${input.chatId}/generations/${input.generationId}/cancel`,
      init: { method: 'POST', headers },
    });
  }

  async getGeneration(input: { chatId: string; generationId: string }): Promise<unknown> {
    const headers = new Headers(await this.options.headers?.());
    const response = await this.options.transport.request({
      url: `${this.options.baseUrl}/api/chats/${input.chatId}/generations/${input.generationId}`,
      init: { method: 'GET', headers },
    });
    if (!response.ok) throw chatRequestError(response);
    return response.json();
  }

  private createGenerationWith(input: {
    generationId?: string;
    path: string;
    body: unknown;
    replayPath?: (generationId: string, afterSequence: number) => string;
  }): ChatGenerationController {
    const generation = this.createGeneration(input.generationId);
    queueMicrotask(() => {
      void generation.start(input).catch(() => undefined);
    });
    return generation;
  }

  createGeneration(generationId?: string): ChatGenerationController {
    let current = createGenerationClientState(
      generationId ?? this.options.createId?.() ?? defaultId(),
    );
    const controller = new AbortController();
    const listeners = new Set<
      (state: GenerationClientState, event: GenerationClientInputEvent) => void
    >();

    const consume = async (
      path: string,
      body?: unknown,
      replayPath?: (generationId: string, afterSequence: number) => string,
      reconnect = true,
    ): Promise<GenerationClientState> => {
      try {
        const headers = new Headers(await this.options.headers?.());
        headers.set('Accept', 'text/event-stream');
        if (body !== undefined) headers.set('Content-Type', 'application/json');
        const response = await this.options.transport.request({
          url: `${this.options.baseUrl}${path}`,
          init: {
            method: body === undefined ? 'GET' : 'POST',
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
          },
          signal: controller.signal,
        });
        if (!response.ok) throw chatRequestError(response);
        let checkpointWrite = Promise.resolve();
        await consumeSseResponse(
          response,
          (event) => {
            current = reduceGenerationClientEvent(current, event);
            for (const listener of listeners) listener(current, event);
            const snapshot = current;
            checkpointWrite = checkpointWrite.then(() =>
              this.options.checkpointStore?.set(snapshot),
            );
          },
          undefined,
          {
            deduplicateEvent: createGenerationEventDeduplicator(),
          },
        );
        await checkpointWrite;
        if (
          current.phase === 'committed' ||
          current.phase === 'cancelled' ||
          current.phase === 'failed'
        ) {
          await this.options.checkpointStore?.remove?.(current.generationId);
        }
        return current;
      } catch (error) {
        if (
          reconnect &&
          replayPath &&
          !controller.signal.aborted &&
          !isAbortError(error) &&
          !isChatHttpError(error)
        ) {
          return consume(
            replayPath(current.generationId, current.lastDurableSequence),
            undefined,
            undefined,
            false,
          );
        }
        if (!isAbortError(error)) {
          const event: GenerationClientInputEvent = {
            version: 1,
            generationId: current.generationId,
            event: {
              type: 'error',
              message: error instanceof Error ? error.message : String(error),
            },
          };
          current = reduceGenerationClientEvent(current, event);
          for (const listener of listeners) listener(current, event);
          await this.options.checkpointStore?.set(current);
        }
        throw error;
      }
    };

    let resolveDone!: (state: GenerationClientState) => void;
    let rejectDone!: (error: unknown) => void;
    const done = new Promise<GenerationClientState>((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    });
    void done.catch(() => undefined);

    const start = ({
      path,
      body,
      generationId,
      replayPath,
    }: {
      path: string;
      body: unknown;
      generationId?: string;
      replayPath?: (generationId: string, afterSequence: number) => string;
    }) => {
      const result = (async () => {
        const id = generationId ?? current.generationId;
        current = createGenerationClientState(id);
        return consume(path, { ...(body as object), generationId: id }, replayPath);
      })();
      result.then(resolveDone, rejectDone);
      return result;
    };

    const resume = ({ path, generationId }: { path: string; generationId: string }) => {
      const result = (async () => {
        const checkpoint = await this.options.checkpointStore?.get(generationId);
        if (checkpoint) {
          current = { ...createGenerationClientState(generationId), ...checkpoint };
        }
        return consume(`${path}?afterSequence=${current.lastDurableSequence}`, undefined);
      })();
      result.then(resolveDone, rejectDone);
      return result;
    };

    return {
      get state() {
        return current;
      },
      signal: controller.signal,
      done,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      start,
      resume,
      cancel: () => controller.abort(),
    };
  }
}
