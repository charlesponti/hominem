import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  VOICE_TRANSCRIPTION_MAX_SIZE_BYTES,
  VoiceTranscriptionError,
  normalizeVoiceMimeType,
  validateVoiceInput,
  transcribeVoiceBuffer,
} from './voice-transcription.service';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockEnv = { OPENROUTER_API_KEY: 'test-openrouter-key' as string | undefined };

vi.mock('./env', () => ({
  get env() {
    return mockEnv;
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeOkResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      choices: [{ message: { content: text } }],
    }),
  };
}

function makeErrorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    statusText: message,
    json: vi.fn().mockResolvedValue({ error: { message } }),
  };
}

function makeAudioBuffer(bytes = 1024): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

// ---------------------------------------------------------------------------
// Pure utility tests
// ---------------------------------------------------------------------------

describe('normalizeVoiceMimeType', () => {
  it('strips codec annotations', () => {
    expect(normalizeVoiceMimeType('audio/webm;codecs=opus')).toBe('audio/webm');
  });

  it('normalises x-wav alias', () => {
    expect(normalizeVoiceMimeType('audio/x-wav')).toBe('audio/wav');
  });

  it('normalises m4a alias', () => {
    expect(normalizeVoiceMimeType('audio/m4a')).toBe('audio/mp4');
  });

  it('returns passthrough for known types', () => {
    expect(normalizeVoiceMimeType('audio/webm')).toBe('audio/webm');
  });
});

describe('validateVoiceInput', () => {
  it('rejects unsupported mime with INVALID_FORMAT code', () => {
    try {
      validateVoiceInput({ mimeType: 'audio/flac', size: 10 });
      throw new Error('Expected VoiceTranscriptionError');
    } catch (error) {
      expect(error).toBeInstanceOf(VoiceTranscriptionError);
      expect((error as VoiceTranscriptionError).code).toBe('INVALID_FORMAT');
      expect((error as VoiceTranscriptionError).statusCode).toBe(400);
    }
  });

  it('rejects oversized payload with TOO_LARGE code', () => {
    try {
      validateVoiceInput({ mimeType: 'audio/webm', size: VOICE_TRANSCRIPTION_MAX_SIZE_BYTES + 1 });
      throw new Error('Expected VoiceTranscriptionError');
    } catch (error) {
      expect(error).toBeInstanceOf(VoiceTranscriptionError);
      expect((error as VoiceTranscriptionError).code).toBe('TOO_LARGE');
      expect((error as VoiceTranscriptionError).statusCode).toBe(400);
    }
  });

  it('accepts valid input and returns normalised mime type', () => {
    expect(validateVoiceInput({ mimeType: 'audio/webm;codecs=opus', size: 100 })).toBe(
      'audio/webm',
    );
  });
});

// ---------------------------------------------------------------------------
// transcribeVoiceBuffer — happy path
// ---------------------------------------------------------------------------

describe('transcribeVoiceBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns transcript text on success', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse('hello world'));

    const result = await transcribeVoiceBuffer({
      buffer: makeAudioBuffer(),
      mimeType: 'audio/webm',
    });

    expect(result.text).toBe('hello world');
  });

  it('trims whitespace from the response', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse('  trimmed text  '));

    const result = await transcribeVoiceBuffer({
      buffer: makeAudioBuffer(),
      mimeType: 'audio/webm',
    });

    expect(result.text).toBe('trimmed text');
  });

  it('calls the OpenRouter chat/completions endpoint', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse('ok'));

    await transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' });

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
  });

  it('sends the correct model', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse('ok'));

    await transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('google/gemini-2.5-flash-lite');
  });

  it('maps audio/mpeg to mp3 format in the request', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse('ok'));

    await transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/mpeg' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    const audioBlock = body.messages[0].content.find(
      (c: { type: string }) => c.type === 'input_audio',
    );
    expect(audioBlock.input_audio.format).toBe('mp3');
  });

  it('includes language hint in the prompt when provided', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse('ok'));

    await transcribeVoiceBuffer({
      buffer: makeAudioBuffer(),
      mimeType: 'audio/webm',
      language: 'fr',
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    const textBlock = body.messages[0].content.find((c: { type: string }) => c.type === 'text');
    expect(textBlock.text).toContain('fr');
  });

  it('sends the Authorization header with the API key', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse('ok'));

    await transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer test-openrouter-key',
    );
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  it('throws AUTH when OPENROUTER_API_KEY is missing', async () => {
    mockEnv.OPENROUTER_API_KEY = undefined;

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'AUTH', statusCode: 401 });

    mockEnv.OPENROUTER_API_KEY = 'test-openrouter-key';
  });

  it('throws INVALID_FORMAT for unsupported mime type', async () => {
    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/flac' }),
    ).rejects.toMatchObject({ code: 'INVALID_FORMAT', statusCode: 400 });
  });

  it('throws TOO_LARGE when buffer exceeds limit', async () => {
    await expect(
      transcribeVoiceBuffer({
        buffer: makeAudioBuffer(VOICE_TRANSCRIPTION_MAX_SIZE_BYTES + 1),
        mimeType: 'audio/webm',
      }),
    ).rejects.toMatchObject({ code: 'TOO_LARGE', statusCode: 400 });
  });

  it('throws AUTH on 401 response', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401, 'Unauthorized'));

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'AUTH', statusCode: 401 });
  });

  it('throws AUTH on 403 response', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(403, 'Forbidden'));

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'AUTH', statusCode: 401 });
  });

  it('throws QUOTA on 429 response', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(429, 'Too Many Requests'));

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'QUOTA', statusCode: 429 });
  });

  it('throws TRANSCRIBE_FAILED on 500 response', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(500, 'Internal Server Error'));

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'TRANSCRIBE_FAILED', statusCode: 500 });
  });

  it('throws TRANSCRIBE_FAILED when fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network timeout'));

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'TRANSCRIBE_FAILED', statusCode: 500 });
  });

  it('wraps non-Error fetch rejections as TRANSCRIBE_FAILED', async () => {
    mockFetch.mockRejectedValueOnce('unexpected string');

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'TRANSCRIBE_FAILED', statusCode: 500 });
  });

  it('all errors are instances of VoiceTranscriptionError', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network timeout'));

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toBeInstanceOf(VoiceTranscriptionError);
  });
});
