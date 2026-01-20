import type { z } from 'zod';

import { BoltExportSchema } from '@hominem/services';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readFileSyncMock, writeFileSyncMock } from '../../../vitest.setup.js';
import { typingMindBase, validTypingMindInput } from '../__tests__/typingmind.mock.js';
import { command, getCustomModelId, guessProvider } from './typingmind-to-bolt.js';

describe('convert-typingmind-to-bolt command', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should convert valid TypingMind export to Bolt format', async () => {
    readFileSyncMock.mockReturnValue(JSON.stringify(validTypingMindInput));
    await command.parseAsync(['node', 'test', 'input.json']);

    expect(writeFileSyncMock).toHaveBeenCalled();
    const writeCalls = writeFileSyncMock.mock.calls;
    expect(writeCalls.length).toBeGreaterThan(0);

    const writtenData = JSON.parse(writeCalls[0][1]) as z.infer<typeof BoltExportSchema>;

    expect(() => BoltExportSchema.parse(writtenData)).not.toThrow();
    expect(writtenData.chats).toHaveLength(1);
    expect(writtenData.chats[0].messages).toHaveLength(2);
    expect(writtenData.version).toBe(3);
  });

  it('should handle array-type message content', async () => {
    const input = {
      data: {
        ...typingMindBase.data,
        chats: [
          {
            ...validTypingMindInput.data.chats[0],
            messages: [
              {
                role: 'assistant',
                content: [
                  { type: 'text', text: 'Part 1' },
                  { type: 'text', text: 'Part 2' },
                ],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
          },
        ],
      },
    };

    readFileSyncMock.mockReturnValue(JSON.stringify(input));
    await command.parseAsync(['node', 'test', 'input.json']);

    const writtenData = JSON.parse(writeFileSyncMock.mock.calls[0][1]) as z.infer<
      typeof BoltExportSchema
    >;
    expect(writtenData.chats[0].messages[0].content).toBe('Part 1\nPart 2');
  });

  it('should handle missing createdAt timestamps', async () => {
    const input = {
      data: {
        ...typingMindBase.data,
        chats: [
          {
            ...validTypingMindInput.data.chats[0],
            messages: [
              {
                role: 'user',
                content: 'Hello',
              },
            ],
          },
        ],
      },
    };

    readFileSyncMock.mockReturnValue(JSON.stringify(input));
    await command.parseAsync(['node', 'test', 'input.json']);

    const writtenData = JSON.parse(writeFileSyncMock.mock.calls[0][1]) as z.infer<
      typeof BoltExportSchema
    >;
    expect(writtenData.chats[0].messages[0].createdAt).toBeDefined();
  });

  it('should use output path from options when provided', async () => {
    readFileSyncMock.mockReturnValue(JSON.stringify(validTypingMindInput));
    await command.parseAsync(['node', 'test', 'input.json', '-o', 'custom-output.json']);

    expect(writeFileSyncMock).toHaveBeenCalledWith('custom-output.json', expect.any(String));
  });

  it('should handle invalid input JSON', async () => {
    readFileSyncMock.mockReturnValue('invalid json');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    await command.parseAsync(['node', 'test', 'input.json']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('helper functions', () => {
  describe('guessProvider', () => {
    it.each([
      ['gpt-4', 'OpenAI'],
      ['claude-2', 'AnthropicAI'],
      ['gemini-pro', 'GoogleAI'],
      ['llama-2', 'Meta'],
      ['unknown-model', 'Unknown'],
      ['', 'Unknown'],
    ])('should correctly identify provider for %s', async (model, expected) => {
      expect(guessProvider(model)).toBe(expected);
    });
  });

  describe('getCustomModelId', () => {
    it.each([
      ['gpt-4', 3],
      ['claude-2', 2],
      ['gemini-pro', 1],
      ['unknown-model', 0],
      ['', 0],
    ])('should return correct custom model ID for %s', async (model, expected) => {
      expect(getCustomModelId(model)).toBe(expected);
    });
  });
});
