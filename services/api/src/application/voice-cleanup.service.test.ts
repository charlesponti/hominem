import { OpenRouterRequestError } from '@hominem/ai';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('@hominem/telemetry', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import {
  buildFallbackOutput,
  cleanupVoiceInput,
  isSafeVoiceCleanup,
  parseVoiceTranscriptCleanupOutput,
  shouldBypassVoiceCleanup,
} from './voice-cleanup.service';

const baseInput = {
  rawText: 'hello this is a raw transcript from the phone',
  source: 'apple-on-device' as const,
};

describe('voice cleanup service', () => {
  it('bypasses short transcripts', async () => {
    const cleanupTranscript = vi.fn();
    const result = await cleanupVoiceInput(
      { ...baseInput, rawText: 'hello' },
      { cleanupTranscript, logError: vi.fn() },
    );

    expect(result).toEqual({
      kind: 'success',
      output: buildFallbackOutput('hello'),
      usage: null,
    });
    expect(cleanupTranscript).not.toHaveBeenCalled();
  });

  it('bypasses one-word transcripts', async () => {
    expect(shouldBypassVoiceCleanup('transcript')).toBe(true);
  });

  it('accepts a valid cleanup', async () => {
    const result = await cleanupVoiceInput(baseInput, {
      cleanupTranscript: vi.fn().mockResolvedValue({
        cleanedText: 'Hello, this is a raw transcript from the phone.',
        usage: null,
      }),
      logError: vi.fn(),
    });

    expect(result).toEqual({
      kind: 'success',
      output: {
        rawText: baseInput.rawText,
        cleanedText: 'Hello, this is a raw transcript from the phone.',
        changed: true,
        mode: 'constrained',
      },
      usage: null,
    });
  });

  it('falls back when cleaned text is empty', async () => {
    const result = await cleanupVoiceInput(baseInput, {
      cleanupTranscript: vi.fn().mockResolvedValue({ cleanedText: '   ', usage: null }),
      logError: vi.fn(),
    });

    expect(result).toEqual({
      kind: 'success',
      output: buildFallbackOutput(baseInput.rawText),
      usage: null,
    });
  });

  it('falls back when cleaned text is too short', async () => {
    expect(isSafeVoiceCleanup(baseInput.rawText, 'hello')).toBe(false);
  });

  it('falls back when cleaned text is too long', async () => {
    const result = await cleanupVoiceInput(baseInput, {
      cleanupTranscript: vi.fn().mockResolvedValue({
        cleanedText:
          'hello this is a raw transcript from the phone with many many many extra words that completely change the length and shape of the original transcript in a suspicious way',
        usage: null,
      }),
      logError: vi.fn(),
    });

    expect(result).toEqual({
      kind: 'success',
      output: buildFallbackOutput(baseInput.rawText),
      usage: null,
    });
  });

  it('propagates provider 401 errors', async () => {
    const result = await cleanupVoiceInput(baseInput, {
      cleanupTranscript: vi
        .fn()
        .mockRejectedValue(new OpenRouterRequestError('auth', { status: 401 })),
      logError: vi.fn(),
    });

    expect(result).toEqual({
      kind: 'provider-error',
      message: 'auth',
      status: 401,
      error: expect.any(OpenRouterRequestError),
    });
  });

  it('propagates provider 429 errors', async () => {
    const result = await cleanupVoiceInput(baseInput, {
      cleanupTranscript: vi
        .fn()
        .mockRejectedValue(new OpenRouterRequestError('quota', { status: 429 })),
      logError: vi.fn(),
    });

    expect(result).toEqual({
      kind: 'provider-error',
      message: 'quota',
      status: 429,
      error: expect.any(OpenRouterRequestError),
    });
  });

  it('falls back on other runtime failures', async () => {
    const result = await cleanupVoiceInput(baseInput, {
      cleanupTranscript: vi.fn().mockRejectedValue(new Error('boom')),
      logError: vi.fn(),
    });

    expect(result).toEqual({
      kind: 'success',
      output: buildFallbackOutput(baseInput.rawText),
      usage: null,
    });
  });
});

describe('parseVoiceTranscriptCleanupOutput', () => {
  it('accepts a valid structured output payload', () => {
    expect(parseVoiceTranscriptCleanupOutput({ cleanedText: 'Hello there.' })).toEqual({
      cleanedText: 'Hello there.',
    });
  });

  it('rejects when choices are missing from a raw provider-style payload', () => {
    expect(() => parseVoiceTranscriptCleanupOutput({})).toThrow(z.ZodError);
  });

  it('rejects when message content is missing', () => {
    expect(() => parseVoiceTranscriptCleanupOutput({ choices: [{ message: {} }] })).toThrow(
      z.ZodError,
    );
  });

  it('rejects invalid json content strings', () => {
    expect(() => parseVoiceTranscriptCleanupOutput('{not-valid-json')).toThrow(z.ZodError);
  });

  it('rejects invalid schema shapes', () => {
    expect(() => parseVoiceTranscriptCleanupOutput({ cleanedText: 123 })).toThrow(z.ZodError);
  });
});
