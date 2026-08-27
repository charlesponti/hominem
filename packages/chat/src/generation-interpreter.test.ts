import { describe, expect, it, vi } from 'vitest';

import {
  createGenerationInterpreter as createPortsInterpreter,
  runGenerationWithPorts,
} from './generation-interpreter';
import { createGenerationState, type GenerationState } from './generation-machine';

const startContext = {
  chatId: 'chat-1',
  kind: 'send' as const,
  userMessageId: 'message-1',
  requestContext: {},
};

describe('generation interpreter', () => {
  it('routes every command to its injected port', async () => {
    const state: GenerationState = createGenerationState('generation-1');
    const calls: string[] = [];
    async function* providerInputs() {
      yield { type: 'effect-stopped' as const };
    }
    const ports = {
      provider: {
        open: vi.fn(async () => providerInputs()),
        retry: vi.fn(async () => ({ type: 'effect-stopped' as const })),
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
        }),
        stop: vi.fn(async () => {
          calls.push('stop');
        }),
      },
    };
    const interpreter = createPortsInterpreter(ports);
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
    const stopped = await interpreter.execute({ type: 'stop-effects' }, state);

    expect(toolInput).toMatchObject({ type: 'tool-result' });
    expect(stopped).toEqual({ type: 'effect-stopped' });
    expect(calls).toEqual(['persist', 'emit', 'save', 'stop']);
    expect(ports.provider.open).toHaveBeenCalledOnce();
    expect(ports.provider.retry).toHaveBeenCalledOnce();
    expect(ports.tools.execute).toHaveBeenCalledWith({ call, idempotencyKey: 'key', state });
    expect(ports.tools.preview).toHaveBeenCalledOnce();
  });

  it('runs a generation through the port interpreter', async () => {
    async function* completion() {
      yield { type: 'provider-chunk' as const, chunk: { content: 'done' } };
      yield {
        type: 'provider-turn-completed' as const,
        requiredToolCall: false,
        confirmationCallIds: [],
      };
    }
    const ports = {
      provider: {
        open: vi.fn(async () => completion()),
        retry: vi.fn(async () => ({ type: 'effect-stopped' as const })),
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
        save: vi.fn(async () => undefined),
        stop: vi.fn(),
      },
    };

    await expect(
      runGenerationWithPorts({ generationId: 'generation-1', ports, startContext }),
    ).resolves.toMatchObject({ phase: 'committed', assistantText: 'done' });
    expect(ports.provider.open).toHaveBeenCalledOnce();
    expect(ports.generation.save).toHaveBeenCalledOnce();
  });
});
