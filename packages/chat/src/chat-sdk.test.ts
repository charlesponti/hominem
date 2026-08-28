import { describe, expect, it, vi } from 'vitest';

import { ChatClient, type ChatOptions } from './chat-sdk';

const context = {
  chatId: 'chat-1',
  kind: 'send' as const,
  userMessageId: 'message-1',
  targetAssistantMessageId: null,
  requestContext: {},
};

function options(): ChatOptions {
  async function* modelTurn() {
    yield { type: 'provider-chunk' as const, chunk: { content: 'hello' } };
    yield {
      type: 'provider-turn-completed' as const,
      requiredToolCall: false,
      confirmationCallIds: [],
    };
  }

  return {
    model: {
      open: vi.fn(() => modelTurn()),
      retry: vi.fn(),
      appendToolResult: vi.fn(),
    },
    tools: {
      execute: vi.fn(),
      preview: vi.fn(),
    },
    lifecycle: {
      events: { persist: vi.fn(), emit: vi.fn() },
      generation: {
        save: vi.fn(async (state) => ({
          id: 'assistant-1',
          chatId: state.generationId,
          role: 'assistant' as const,
          content: state.assistantText,
        })),
        stop: vi.fn(),
      },
    },
  };
}

describe('Chat generations resource', () => {
  it('creates an addressable generation and runs it through configured ports', async () => {
    const configured = options();
    const chat = new ChatClient(configured);
    const generation = chat.generations.create({ id: 'generation-1', context });

    expect(generation.id).toBe('generation-1');
    expect(generation.context).toEqual(context);
    expect(generation.state).toBeNull();

    await expect(generation.run()).resolves.toMatchObject({
      phase: 'committed',
      assistantText: 'hello',
    });
    expect(generation.state).toMatchObject({ phase: 'committed' });
    expect(configured.model.open).toHaveBeenCalledOnce();
    expect(configured.lifecycle.generation.save).toHaveBeenCalledOnce();
  });

  it('memoizes a run so a retrying caller cannot execute the generation twice', async () => {
    const configured = options();
    const generation = new ChatClient(configured).generations.create({
      id: 'generation-1',
      context,
    });

    const first = generation.run();
    const second = generation.run();

    expect(first).toBe(second);
    await Promise.all([first, second]);
    expect(configured.model.open).toHaveBeenCalledOnce();
  });
});
