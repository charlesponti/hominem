import { describe, expect, it, vi } from 'vitest';

import type { GenerationStartContext } from './generation-events';
import {
  createGenerationInterpreter as createAdaptersInterpreter,
  EffectCommandTimeoutError,
  generate,
} from './generation-interpreter';
import {
  createGenerationState,
  type GenerationInput,
  type GenerationState,
  type ToolResult,
} from './generation-machine';
import { messageSnapshot } from './generation-test-fixtures';

const savedMessage = messageSnapshot({ id: 'assistant-1', chatId: 'chat-1', content: 'done' });

const startContext = {
  chatId: 'chat-1',
  kind: 'send',
  userMessageId: 'message-1',
  targetAssistantMessageId: null,
  requestContext: {},
} satisfies GenerationStartContext;

describe('generation interpreter', () => {
  it('routes every command to its injected port', async () => {
    const state: GenerationState = createGenerationState('generation-1');
    const calls: string[] = [];
    async function* providerInputs(): AsyncGenerator<GenerationInput> {
      yield { type: 'effect-stopped' };
    }
    async function stopped(): Promise<GenerationInput> {
      return { type: 'effect-stopped' };
    }
    const ports = {
      provider: {
        open: vi.fn(async () => providerInputs()),
        retry: vi.fn(stopped),
        appendToolResult: vi.fn(),
      },
      tools: {
        execute: vi.fn(async () => ({
          callId: 'call-1',
          toolName: 'search',
          content: '{}',
          error: false,
        })),
        preview: vi.fn(async () => ({
          callId: 'call-1',
          toolName: 'search',
          content: '{}',
          error: false,
        })),
      },
      events: {
        persist: vi.fn(async () => {
          calls.push('persist');
        }),
        emit: vi.fn(async () => {
          calls.push('emit');
        }),
      },
      generation: {
        save: vi.fn(async () => {
          calls.push('save');
          return savedMessage;
        }),
        stop: vi.fn(async () => {
          calls.push('stop');
        }),
      },
    };
    const interpreter = createAdaptersInterpreter(ports);
    const call = { id: 'call-1', name: 'search', arguments: '{}', iteration: 0, turnId: 'turn-1' };

    await interpreter.execute(
      {
        type: 'persist',
        event: { type: 'generation.started', context: startContext },
        idempotencyKey: 'generation-1:generation.started',
      },
      state,
    );
    await interpreter.execute({ type: 'emit', event: { type: 'text-delta', text: 'x' } }, state);
    await interpreter.execute(
      { type: 'open-provider-turn', turnId: 'turn-1', iteration: 0 },
      state,
    );
    await interpreter.execute({ type: 'retry-provider', attempt: 1 }, state);
    const toolInput = await interpreter.execute(
      { type: 'execute-tool', call, idempotencyKey: 'key' },
      state,
    );
    await interpreter.execute({ type: 'preview-tool', call, idempotencyKey: 'key' }, state);
    await interpreter.execute({ type: 'save-generation' }, state);
    const stoppedResult = await interpreter.execute({ type: 'stop-effects' }, state);

    expect(toolInput).toMatchObject({ type: 'tool-result' });
    expect(stoppedResult).toEqual({ type: 'effect-stopped' });
    expect(calls).toEqual(['persist', 'emit', 'save', 'stop']);
    expect(ports.provider.open).toHaveBeenCalledOnce();
    expect(ports.provider.retry).toHaveBeenCalledOnce();
    expect(ports.tools.execute).toHaveBeenCalledWith({ call, idempotencyKey: 'key', state });
    expect(ports.provider.appendToolResult).toHaveBeenCalledWith({
      call,
      result: { callId: 'call-1', toolName: 'search', content: '{}', error: false },
      state,
    });
    expect(ports.tools.preview).toHaveBeenCalledOnce();
  });

  it('times out a persist that never resolves instead of hanging forever', async () => {
    const ports = {
      provider: { open: vi.fn(), retry: vi.fn() },
      tools: { execute: vi.fn(), preview: vi.fn() },
      events: {
        persist: vi.fn(() => new Promise<void>(() => {})),
        emit: vi.fn(),
      },
      generation: { save: vi.fn(), stop: vi.fn() },
    };
    const interpreter = createAdaptersInterpreter(ports, { effectTimeoutsMs: { persist: 5 } });
    const state = createGenerationState('generation-1');

    await expect(
      interpreter.execute(
        {
          type: 'persist',
          event: { type: 'generation.started', context: startContext },
          idempotencyKey: 'generation-1:generation.started',
        },
        state,
      ),
    ).rejects.toThrow(EffectCommandTimeoutError);
  });

  it('times out a tool execute that never resolves instead of hanging forever', async () => {
    const ports = {
      provider: { open: vi.fn(), retry: vi.fn() },
      tools: {
        execute: vi.fn(() => new Promise<ToolResult>(() => {})),
        preview: vi.fn(),
      },
      events: { persist: vi.fn(), emit: vi.fn() },
      generation: { save: vi.fn(), stop: vi.fn() },
    };
    const interpreter = createAdaptersInterpreter(ports, {
      effectTimeoutsMs: { 'execute-tool': 5 },
    });
    const state = createGenerationState('generation-1');
    const call = { id: 'call-1', name: 'search', arguments: '{}', iteration: 0, turnId: 'turn-1' };

    await expect(
      interpreter.execute({ type: 'execute-tool', call, idempotencyKey: 'key' }, state),
    ).rejects.toThrow(EffectCommandTimeoutError);
  });

  it('times out a tool preview that never resolves instead of hanging forever', async () => {
    const ports = {
      provider: { open: vi.fn(), retry: vi.fn() },
      tools: {
        execute: vi.fn(),
        preview: vi.fn(() => new Promise<ToolResult>(() => {})),
      },
      events: { persist: vi.fn(), emit: vi.fn() },
      generation: { save: vi.fn(), stop: vi.fn() },
    };
    const interpreter = createAdaptersInterpreter(ports, {
      effectTimeoutsMs: { 'preview-tool': 5 },
    });
    const state = createGenerationState('generation-1');
    const call = { id: 'call-1', name: 'search', arguments: '{}', iteration: 0, turnId: 'turn-1' };

    await expect(
      interpreter.execute({ type: 'preview-tool', call, idempotencyKey: 'key' }, state),
    ).rejects.toThrow(EffectCommandTimeoutError);
  });

  it('times out a save that never resolves instead of hanging forever', async () => {
    const ports = {
      provider: { open: vi.fn(), retry: vi.fn() },
      tools: { execute: vi.fn(), preview: vi.fn() },
      events: { persist: vi.fn(), emit: vi.fn() },
      generation: {
        save: vi.fn(() => new Promise<typeof savedMessage>(() => {})),
        stop: vi.fn(),
      },
    };
    const interpreter = createAdaptersInterpreter(ports, {
      effectTimeoutsMs: { 'save-generation': 5 },
    });
    const state = createGenerationState('generation-1');

    await expect(interpreter.execute({ type: 'save-generation' }, state)).rejects.toThrow(
      EffectCommandTimeoutError,
    );
  });

  it('runs a generation through the port interpreter', async () => {
    async function* completion(): AsyncGenerator<GenerationInput> {
      yield { type: 'provider-chunk', chunk: { content: 'done' } };
      yield {
        type: 'provider-turn-completed',
        requiredToolCall: false,
        confirmationCallIds: [],
      };
    }
    async function stopped(): Promise<GenerationInput> {
      return { type: 'effect-stopped' };
    }
    const ports = {
      provider: {
        open: vi.fn(async () => completion()),
        retry: vi.fn(stopped),
      },
      tools: {
        execute: vi.fn(),
        preview: vi.fn(),
      },
      events: {
        persist: vi.fn(),
        emit: vi.fn(),
      },
      generation: {
        save: vi.fn(async () => savedMessage),
        stop: vi.fn(),
      },
    };

    await expect(
      generate({ generationId: 'generation-1', adapters: ports, startContext }),
    ).resolves.toMatchObject({ phase: 'committed', assistantText: 'done' });
    expect(ports.provider.open).toHaveBeenCalledOnce();
    expect(ports.generation.save).toHaveBeenCalledOnce();
  });

  it('checks cancellation between provider inputs and stops cleanly', async () => {
    let checks = 0;
    async function* completion(): AsyncGenerator<GenerationInput> {
      yield { type: 'provider-chunk', chunk: { content: 'partial' } };
      yield {
        type: 'provider-turn-completed',
        requiredToolCall: false,
        confirmationCallIds: [],
      };
    }
    const ports = {
      control: {
        isCancelled: vi.fn(() => {
          checks += 1;
          return checks > 1;
        }),
      },
      provider: {
        open: vi.fn(async () => completion()),
        retry: vi.fn(),
      },
      tools: {
        execute: vi.fn(),
        preview: vi.fn(),
      },
      events: {
        persist: vi.fn(),
        emit: vi.fn(),
      },
      generation: {
        save: vi.fn(async () => savedMessage),
        stop: vi.fn(),
      },
    };

    await expect(
      generate({ generationId: 'generation-1', adapters: ports, startContext }),
    ).resolves.toMatchObject({ phase: 'cancelled', assistantText: 'partial' });
    expect(ports.generation.stop).toHaveBeenCalledOnce();
    expect(ports.generation.save).not.toHaveBeenCalled();
  });

  it('waits through the injected retry port before reopening the provider', async () => {
    async function* failedCompletion(): AsyncGenerator<GenerationInput> {
      yield {
        type: 'provider-turn-failed',
        message: 'temporary failure',
        transient: true,
        attempt: 1,
        maxAttempts: 2,
      };
    }
    const waitBeforeRetry = vi.fn();
    const ports = {
      control: { waitBeforeRetry },
      provider: {
        open: vi.fn(async () => failedCompletion()),
        retry: vi.fn(
          (): GenerationInput => ({
            type: 'provider-turn-completed',
            requiredToolCall: false,
            confirmationCallIds: [],
          }),
        ),
      },
      tools: {
        execute: vi.fn(),
        preview: vi.fn(),
      },
      events: {
        persist: vi.fn(),
        emit: vi.fn(),
      },
      generation: {
        save: vi.fn(async () => savedMessage),
        stop: vi.fn(),
      },
    };

    await expect(
      generate({ generationId: 'generation-1', adapters: ports, startContext }),
    ).resolves.toMatchObject({ phase: 'committed' });
    expect(waitBeforeRetry).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 2, state: expect.any(Object) }),
    );
    expect(ports.provider.retry).toHaveBeenCalledOnce();
  });

  it('turns a cancelled synchronous retry result into a terminal cancellation', async () => {
    async function* failedCompletion(): AsyncGenerator<GenerationInput> {
      yield {
        type: 'provider-turn-failed',
        message: 'temporary failure',
        transient: true,
        attempt: 1,
        maxAttempts: 2,
      };
    }
    let checks = 0;
    const ports = {
      control: {
        isCancelled: vi.fn(() => {
          checks += 1;
          return checks > 1;
        }),
      },
      provider: {
        open: vi.fn(async () => failedCompletion()),
        retry: vi.fn(
          (): GenerationInput => ({
            type: 'provider-turn-completed',
            requiredToolCall: false,
            confirmationCallIds: [],
          }),
        ),
      },
      tools: {
        execute: vi.fn(),
        preview: vi.fn(),
      },
      events: {
        persist: vi.fn(),
        emit: vi.fn(),
      },
      generation: {
        save: vi.fn(async () => savedMessage),
        stop: vi.fn(),
      },
    };

    await expect(
      generate({ generationId: 'generation-1', adapters: ports, startContext }),
    ).resolves.toMatchObject({ phase: 'cancelled' });
    expect(ports.provider.retry).toHaveBeenCalledOnce();
    expect(ports.generation.stop).toHaveBeenCalledOnce();
  });

  it('does not start tool or save effects after cancellation is observed', async () => {
    const ports = {
      control: { isCancelled: vi.fn(() => true) },
      provider: {
        open: vi.fn(),
        retry: vi.fn(),
        appendToolResult: vi.fn(),
      },
      tools: {
        execute: vi.fn(),
        preview: vi.fn(),
      },
      events: {
        persist: vi.fn(),
        emit: vi.fn(),
      },
      generation: {
        save: vi.fn(async () => savedMessage),
        stop: vi.fn(),
      },
    };
    const interpreter = createAdaptersInterpreter(ports);
    const state = createGenerationState('generation-1');
    const call = { id: 'call-1', name: 'search', arguments: '{}', iteration: 0, turnId: 'turn-1' };

    await expect(
      interpreter.execute({ type: 'execute-tool', call, idempotencyKey: 'key' }, state),
    ).resolves.toEqual({ type: 'cancel-requested' });
    await expect(
      interpreter.execute({ type: 'preview-tool', call, idempotencyKey: 'key' }, state),
    ).resolves.toEqual({ type: 'cancel-requested' });
    await expect(interpreter.execute({ type: 'save-generation' }, state)).resolves.toEqual({
      type: 'cancel-requested',
    });
    expect(ports.tools.execute).not.toHaveBeenCalled();
    expect(ports.tools.preview).not.toHaveBeenCalled();
    expect(ports.generation.save).not.toHaveBeenCalled();
  });
});
