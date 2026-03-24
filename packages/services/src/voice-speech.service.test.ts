import { describe, expect, it, vi, beforeEach } from 'vitest';

import { VoiceSpeechError, generateSpeechBuffer } from './voice-speech.service';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('ai', () => ({
  experimental_generateSpeech: vi.fn(),
}));

vi.mock('./ai-model', () => ({
  getOpenAIAudioProvider: vi.fn(),
}));

import { experimental_generateSpeech } from 'ai';

import { getOpenAIAudioProvider } from './ai-model';

const mockGenerateSpeech = vi.mocked(experimental_generateSpeech);
const mockGetProvider = vi.mocked(getOpenAIAudioProvider);

function makeProviderStub() {
  return {
    speech: vi.fn().mockReturnValue({ modelId: 'tts-1' }),
  } as unknown as ReturnType<typeof getOpenAIAudioProvider>;
}

function makeSpeechResult(overrides: Partial<{ base64: string; mimeType: string }> = {}) {
  const base64 = overrides.base64 ?? Buffer.from('fake-audio').toString('base64');
  return {
    audio: {
      base64,
      mimeType: overrides.mimeType ?? 'audio/mpeg',
      format: 'mp3' as const,
      uint8Array: Buffer.from(base64, 'base64'),
    },
    warnings: [],
    responses: [],
    providerMetadata: {},
  };
}

const defaultInput = { text: 'Hello world', voice: 'alloy', speed: 1.0 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateSpeechBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProvider.mockReturnValue(makeProviderStub());
  });

  it('returns audioBuffer and mediaType on success', async () => {
    const b64 = Buffer.from('audio-data').toString('base64');
    mockGenerateSpeech.mockResolvedValueOnce(
      makeSpeechResult({ base64: b64, mimeType: 'audio/mpeg' }),
    );

    const result = await generateSpeechBuffer(defaultInput);

    expect(result.audioBuffer).toBeInstanceOf(Buffer);
    expect(result.audioBuffer).toEqual(Buffer.from(b64, 'base64'));
    expect(result.mediaType).toBe('audio/mpeg');
  });

  it('calls getOpenAIAudioProvider and passes speech("tts-1") to experimental_generateSpeech', async () => {
    const providerStub = makeProviderStub();
    mockGetProvider.mockReturnValue(providerStub);
    mockGenerateSpeech.mockResolvedValueOnce(makeSpeechResult());

    await generateSpeechBuffer(defaultInput);

    expect(mockGetProvider).toHaveBeenCalledOnce();
    expect(providerStub.speech).toHaveBeenCalledWith('tts-1');
    expect(mockGenerateSpeech).toHaveBeenCalledOnce();
  });

  it('forwards text, voice, speed, and outputFormat to experimental_generateSpeech', async () => {
    mockGenerateSpeech.mockResolvedValueOnce(makeSpeechResult());

    await generateSpeechBuffer({ text: 'Hi', voice: 'nova', speed: 1.5 });

    const call = mockGenerateSpeech.mock.calls[0][0];
    expect(call.text).toBe('Hi');
    expect(call.voice).toBe('nova');
    expect(call.speed).toBe(1.5);
    expect(call.outputFormat).toBe('mp3');
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  it('throws 401 when getOpenAIAudioProvider throws', async () => {
    mockGetProvider.mockImplementationOnce(() => {
      throw new Error('OPENAI_API_KEY is required for audio features');
    });

    await expect(generateSpeechBuffer(defaultInput)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid API configuration.',
    });
  });

  it('throws 429 for quota errors from upstream', async () => {
    mockGenerateSpeech.mockRejectedValueOnce(new Error('quota exceeded'));

    await expect(generateSpeechBuffer(defaultInput)).rejects.toMatchObject({
      statusCode: 429,
      message: 'API quota exceeded. Please try again later.',
    });
  });

  it('throws 401 for API key errors from upstream', async () => {
    mockGenerateSpeech.mockRejectedValueOnce(new Error('Invalid API key provided'));

    await expect(generateSpeechBuffer(defaultInput)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid API configuration.',
    });
  });

  it('throws 400 for content policy violations', async () => {
    mockGenerateSpeech.mockRejectedValueOnce(new Error('content_policy violation'));

    await expect(generateSpeechBuffer(defaultInput)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Text content not allowed by content policy.',
    });
  });

  it('wraps unknown Error as 500 TRANSCRIBE_FAILED', async () => {
    mockGenerateSpeech.mockRejectedValueOnce(new Error('network timeout'));

    await expect(generateSpeechBuffer(defaultInput)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Speech generation failed: network timeout',
    });
  });

  it('wraps non-Error throws as 500', async () => {
    mockGenerateSpeech.mockRejectedValueOnce('unexpected string throw');

    await expect(generateSpeechBuffer(defaultInput)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to generate speech',
    });
  });

  it('result errors are instances of VoiceSpeechError', async () => {
    mockGenerateSpeech.mockRejectedValueOnce(new Error('quota exceeded'));

    await expect(generateSpeechBuffer(defaultInput)).rejects.toBeInstanceOf(VoiceSpeechError);
  });
});
