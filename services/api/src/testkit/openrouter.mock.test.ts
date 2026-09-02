import { streamChatCompletion } from '@hominem/ai';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { installOpenRouterMock } from './openrouter.mock';

let stopMock: (() => void) | undefined;

beforeAll(() => {
  stopMock = installOpenRouterMock();
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

  it('selects the read-only collection listing tool for list requests', async () => {
    const chunks = await collect(
      streamChatCompletion({
        model: 'test-model',
        messages: [{ role: 'user', content: 'List my collections.' }],
        tools: [
          {
            type: 'function',
            function: { name: 'list_collections', description: 'List collections.' },
          },
        ],
      }),
    );

    expect(chunks[0]?.choices[0]?.delta?.toolCalls?.[0]?.function?.name).toBe('list_collections');
  });

  it('routes from the latest user request when earlier history mentions another tool', async () => {
    const chunks = await collect(
      streamChatCompletion({
        model: 'test-model',
        messages: [
          { role: 'user', content: 'List my collections.' },
          { role: 'assistant', content: 'Here are your collections.' },
          { role: 'user', content: 'Create a private collection.' },
        ],
        tools: [
          {
            type: 'function',
            function: { name: 'create_collection', description: 'Create a collection.' },
          },
          {
            type: 'function',
            function: { name: 'list_collections', description: 'List collections.' },
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

  it('returns a terminal acknowledgment after a rejected tool request', async () => {
    const chunks = await collect(
      streamChatCompletion({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Reject the collection request.' }],
        tools: [
          {
            type: 'function',
            function: { name: 'create_collection', description: 'Create a collection.' },
          },
        ],
      }),
    );

    expect(chunks[0]?.choices[0]?.delta?.content).toBe('The tool request was rejected.');
    expect(chunks[0]?.choices[0]?.delta?.toolCalls).toBeUndefined();
  });

  it('starts the Omiro confirmation-rejection scenario with a tool call', async () => {
    const chunks = await collect(
      streamChatCompletion({
        model: 'test-model',
        messages: [
          {
            role: 'user',
            content: 'B008-OMIRO-CONFIRM-REJECT Create a private collection.',
          },
        ],
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

  it('returns a rejection acknowledgment after a rejected tool result', async () => {
    const chunks = await collect(
      streamChatCompletion({
        model: 'test-model',
        messages: [
          { role: 'user', content: 'Create a collection.' },
          { role: 'assistant', content: null, toolCalls: [] },
          {
            role: 'tool',
            content: JSON.stringify({ error: 'User rejected tool call' }),
            toolCallId: 'call-1',
          },
        ],
      }),
    );

    expect(chunks[0]?.choices[0]?.delta?.content).toBe('The tool request was rejected.');
    expect(chunks[0]?.choices[0]?.delta?.toolCalls).toBeUndefined();
  });

  it('scripts a failed read-only tool call for the Browser failure scenario', async () => {
    const chunks = await collect(
      streamChatCompletion({
        model: 'test-model',
        messages: [{ role: 'user', content: 'List my collections and reply with TOOL-B009-FAIL.' }],
        tools: [
          {
            type: 'function',
            function: { name: 'list_collections', description: 'List collections.' },
          },
        ],
      }),
    );

    expect(chunks[0]?.choices[0]?.delta?.toolCalls?.[0]?.function?.name).toBe('list_collections');
    expect(chunks[0]?.choices[0]?.delta?.toolCalls?.[0]?.function?.arguments).toBe('{invalid');
  });

  it('returns a terminal failure acknowledgment after a failed tool result', async () => {
    const chunks = await collect(
      streamChatCompletion({
        model: 'test-model',
        messages: [
          { role: 'user', content: 'List my collections and reply with TOOL-B009-FAIL.' },
          { role: 'assistant', content: null, toolCalls: [] },
          {
            role: 'tool',
            content: JSON.stringify({ error: 'Tool call failed' }),
            toolCallId: 'call-1',
          },
        ],
      }),
    );

    expect(chunks[0]?.choices[0]?.delta?.content).toBe('The tool request failed.');
    expect(chunks[0]?.choices[0]?.delta?.toolCalls).toBeUndefined();
  });

  it('surfaces one provider failure, then serves the scripted retry response', async () => {
    const request = {
      model: 'test-model',
      messages: [{ role: 'user' as const, content: 'PROVIDER-B010-FAIL' }],
    };

    await expect(collect(streamChatCompletion(request))).rejects.toThrow(
      'Scripted provider failure',
    );

    const retry = await collect(streamChatCompletion(request));
    expect(retry[0]?.choices[0]?.delta?.content).toBe('Scripted response: PROVIDER-B010-FAIL');
  });

  it('delays the cancel-before-execution control', async () => {
    const startedAt = Date.now();
    await collect(
      streamChatCompletion({
        model: 'test-model',
        response_format: { type: 'json_object' },
        stream: true,
        messages: [{ role: 'user', content: 'B011-CANCEL-BEFORE' }],
      }),
    );

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(2_000);
  }, 15_000);

  it('streams controlled Browser recovery frames with deterministic gaps', async () => {
    const startedAt = Date.now();
    const chunks = await collect(
      streamChatCompletion({
        model: 'test-model',
        messages: [{ role: 'user', content: 'B013-DISCONNECT' }],
      }),
    );

    expect(chunks).toHaveLength(2);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(700);
  });
});
