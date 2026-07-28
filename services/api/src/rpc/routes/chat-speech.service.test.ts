import { describe, expect, it, vi } from 'vitest';

vi.mock('@hominem/telemetry', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { synthesizeChatReplySpeech } from './chat-speech.service';

describe('chat speech service', () => {
  it('synthesizes speech for non-empty text', async () => {
    const buffer = Buffer.from('fake-audio-bytes');
    const synthesize = vi.fn().mockResolvedValue({ buffer, mimeType: 'audio/mpeg' });

    const result = await synthesizeChatReplySpeech('Hello there, how can I help?', {
      synthesize,
      logError: vi.fn(),
    });

    expect(result).toEqual({ kind: 'success', buffer, mimeType: 'audio/mpeg' });
    expect(synthesize).toHaveBeenCalledWith({ text: 'Hello there, how can I help?' });
  });

  it('truncates text over the max length before synthesizing', async () => {
    const longText = 'a'.repeat(3000);
    const synthesize = vi.fn().mockResolvedValue({
      buffer: Buffer.from('audio'),
      mimeType: 'audio/mpeg',
    });

    await synthesizeChatReplySpeech(longText, { synthesize, logError: vi.fn() });

    const calledWith = synthesize.mock.calls[0][0] as { text: string };
    expect(calledWith.text.length).toBe(2000);
  });

  it('returns an error result for empty/whitespace-only text without calling synthesize', async () => {
    const synthesize = vi.fn();
    const result = await synthesizeChatReplySpeech('   ', { synthesize, logError: vi.fn() });

    expect(result).toEqual({ kind: 'error', message: 'No text to synthesize' });
    expect(synthesize).not.toHaveBeenCalled();
  });

  it('returns an error result when synthesis throws', async () => {
    const logError = vi.fn();
    const synthesize = vi.fn().mockRejectedValue(new Error('provider down'));

    const result = await synthesizeChatReplySpeech('Some reply text', { synthesize, logError });

    expect(result).toEqual({ kind: 'error', message: 'provider down' });
    expect(logError).toHaveBeenCalled();
  });
});
