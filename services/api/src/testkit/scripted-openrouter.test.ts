import { streamChatCompletion } from '@hominem/ai';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { installScriptedOpenRouter } from './scripted-openrouter';

let stopMock: (() => void) | undefined;

beforeAll(() => {
  stopMock = installScriptedOpenRouter();
});
afterAll(() => stopMock?.());

async function collect<T>(stream: AsyncIterable<T>) {
  const chunks: T[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

describe('scripted OpenRouter provider', () => {
  it('returns a deterministic collection tool call', async () => {
    const chunks = await collect(
      streamChatCompletion({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Create a collection.' }],
        tools: [
          {
            type: 'function',
            function: { name: 'create_collection', description: 'Create a collection.' },
          },
        ],
      }),
    );

    expect(chunks[0]?.choices[0]?.delta?.toolCalls?.[0]?.function?.name).toBe('create_collection');
  });

  it('returns a deterministic completion after a tool result', async () => {
    const chunks = await collect(
      streamChatCompletion({
        model: 'test-model',
        messages: [
          { role: 'user', content: 'Create a collection.' },
          { role: 'assistant', content: null, toolCalls: [] },
          { role: 'tool', content: '{"name":"created"}', toolCallId: 'call-1' },
        ],
      }),
    );

    expect(chunks[0]?.choices[0]?.delta?.content).toBe('The collection was created successfully.');
  });
});
