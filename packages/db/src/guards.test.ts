import { describe, expect, it } from 'vitest';

import { parseChatMessageFiles, parseChatMessageToolCalls } from './guards';

describe('chat message guards', () => {
  it('parses valid file attachment records', () => {
    expect(
      parseChatMessageFiles([
        {
          type: 'image',
          fileId: 'file-1',
          url: 'https://example.com/image.png',
          filename: 'image.png',
          mimeType: 'image/png',
          size: 42,
          metadata: { width: 100 },
        },
        { type: 'file' },
      ]),
    ).toEqual([
      {
        type: 'image',
        fileId: 'file-1',
        url: 'https://example.com/image.png',
        filename: 'image.png',
        mimeType: 'image/png',
        size: 42,
        metadata: { width: 100 },
      },
      { type: 'file' },
    ]);
  });

  it('rejects invalid file attachment payloads', () => {
    expect(parseChatMessageFiles(null)).toBeNull();
    expect(parseChatMessageFiles([{ type: 'video' }])).toBeNull();
    expect(parseChatMessageFiles([{ type: 'file', fileId: 123 }])).toBeNull();
    expect(parseChatMessageFiles([{ type: 'file', metadata: null }])).toBeNull();
  });

  it('parses a generated audio reply attachment', () => {
    expect(
      parseChatMessageFiles([
        {
          type: 'audio',
          url: 'https://files.example.com/reply.mp3',
          filename: 'reply.mp3',
          mimeType: 'audio/mpeg',
          size: 4096,
        },
      ]),
    ).toEqual([
      {
        type: 'audio',
        url: 'https://files.example.com/reply.mp3',
        filename: 'reply.mp3',
        mimeType: 'audio/mpeg',
        size: 4096,
      },
    ]);
  });

  it('parses valid tool call records', () => {
    expect(
      parseChatMessageToolCalls([
        {
          type: 'tool-call',
          toolName: 'search',
          toolCallId: 'call-1',
          args: { query: 'notes' },
        },
      ]),
    ).toEqual([
      {
        type: 'tool-call',
        toolName: 'search',
        toolCallId: 'call-1',
        args: { query: 'notes' },
      },
    ]);
  });

  it('rejects invalid tool call payloads', () => {
    expect(parseChatMessageToolCalls(undefined)).toBeNull();
    expect(parseChatMessageToolCalls([{ type: 'tool-result' }])).toBeNull();
    expect(
      parseChatMessageToolCalls([
        {
          type: 'tool-call',
          toolName: 'search',
          toolCallId: 'call-1',
          args: { limit: 10 },
        },
      ]),
    ).toBeNull();
  });
});
