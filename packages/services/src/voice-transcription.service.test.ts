import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  VOICE_TRANSCRIPTION_MAX_SIZE_BYTES,
  VoiceTranscriptionError,
  normalizeVoiceMimeType,
  validateVoiceInput,
  transcribeVoiceBuffer,
} from './voice-transcription.service'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('ai', () => ({
  experimental_transcribe: vi.fn(),
}))

vi.mock('./ai-model', () => ({
  getOpenAIAudioProvider: vi.fn(),
}))

import { experimental_transcribe } from 'ai'
import { getOpenAIAudioProvider } from './ai-model'

const mockTranscribe = vi.mocked(experimental_transcribe)
const mockGetProvider = vi.mocked(getOpenAIAudioProvider)

// A minimal stub for the AI SDK provider — only .transcription() is needed
function makeProviderStub() {
  return {
    transcription: vi.fn().mockReturnValue({ modelId: 'whisper-1' }),
  } as unknown as ReturnType<typeof getOpenAIAudioProvider>
}

// A minimal valid transcription result matching the AI SDK's TranscriptionResult shape
function makeTranscriptionResult(overrides: Partial<{
  text: string
  language: string
  durationInSeconds: number
  segments: { text: string; startSecond: number; endSecond: number }[]
}> = {}) {
  return {
    text: overrides.text ?? 'hello world',
    language: overrides.language ?? 'en',
    durationInSeconds: overrides.durationInSeconds ?? 2.5,
    segments: overrides.segments ?? [
      { text: 'hello world', startSecond: 0, endSecond: 2.5 },
    ],
    warnings: [],
    responses: [],
    providerMetadata: {},
  }
}

// A small valid audio buffer (WebM MIME type, well under the size limit)
function makeAudioBuffer(bytes = 1024): ArrayBuffer {
  return new Uint8Array(bytes).buffer
}

// ---------------------------------------------------------------------------
// Pure utility tests (no mocks needed)
// ---------------------------------------------------------------------------

describe('normalizeVoiceMimeType', () => {
  it('strips codec annotations', () => {
    expect(normalizeVoiceMimeType('audio/webm;codecs=opus')).toBe('audio/webm')
  })

  it('normalises x-wav alias', () => {
    expect(normalizeVoiceMimeType('audio/x-wav')).toBe('audio/wav')
  })

  it('normalises m4a alias', () => {
    expect(normalizeVoiceMimeType('audio/m4a')).toBe('audio/mp4')
  })

  it('returns passthrough for known types', () => {
    expect(normalizeVoiceMimeType('audio/webm')).toBe('audio/webm')
  })
})

describe('validateVoiceInput', () => {
  it('rejects unsupported mime with INVALID_FORMAT code', () => {
    expect(() => validateVoiceInput({ mimeType: 'audio/flac', size: 10 }))
      .toThrowError(VoiceTranscriptionError)

    try {
      validateVoiceInput({ mimeType: 'audio/flac', size: 10 })
    } catch (error) {
      expect(error).toBeInstanceOf(VoiceTranscriptionError)
      expect((error as VoiceTranscriptionError).code).toBe('INVALID_FORMAT')
      expect((error as VoiceTranscriptionError).statusCode).toBe(400)
    }
  })

  it('rejects oversized payload with TOO_LARGE code', () => {
    try {
      validateVoiceInput({
        mimeType: 'audio/webm',
        size: VOICE_TRANSCRIPTION_MAX_SIZE_BYTES + 1,
      })
      throw new Error('Expected VoiceTranscriptionError to be thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(VoiceTranscriptionError)
      expect((error as VoiceTranscriptionError).code).toBe('TOO_LARGE')
      expect((error as VoiceTranscriptionError).statusCode).toBe(400)
    }
  })

  it('accepts valid input and returns normalised mime type', () => {
    const result = validateVoiceInput({ mimeType: 'audio/webm;codecs=opus', size: 100 })
    expect(result).toBe('audio/webm')
  })
})

// ---------------------------------------------------------------------------
// transcribeVoiceBuffer — happy path
// ---------------------------------------------------------------------------

describe('transcribeVoiceBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetProvider.mockReturnValue(makeProviderStub())
  })

  it('returns transcript text on success', async () => {
    mockTranscribe.mockResolvedValueOnce(makeTranscriptionResult({ text: 'test transcript' }))

    const result = await transcribeVoiceBuffer({
      buffer: makeAudioBuffer(),
      mimeType: 'audio/webm',
    })

    expect(result.text).toBe('test transcript')
  })

  it('includes language when present', async () => {
    mockTranscribe.mockResolvedValueOnce(makeTranscriptionResult({ language: 'fr' }))

    const result = await transcribeVoiceBuffer({
      buffer: makeAudioBuffer(),
      mimeType: 'audio/webm',
    })

    expect(result.language).toBe('fr')
  })

  it('includes duration when present', async () => {
    mockTranscribe.mockResolvedValueOnce(makeTranscriptionResult({ durationInSeconds: 5.0 }))

    const result = await transcribeVoiceBuffer({
      buffer: makeAudioBuffer(),
      mimeType: 'audio/webm',
    })

    expect(result.duration).toBe(5.0)
  })

  it('maps segments to start/end shape', async () => {
    mockTranscribe.mockResolvedValueOnce(
      makeTranscriptionResult({
        segments: [
          { text: 'hello', startSecond: 0, endSecond: 1 },
          { text: 'world', startSecond: 1, endSecond: 2 },
        ],
      }),
    )

    const result = await transcribeVoiceBuffer({
      buffer: makeAudioBuffer(),
      mimeType: 'audio/webm',
    })

    expect(result.segments).toEqual([
      { text: 'hello', start: 0, end: 1 },
      { text: 'world', start: 1, end: 2 },
    ])
  })

  it('calls getOpenAIAudioProvider and passes its model to experimental_transcribe', async () => {
    const providerStub = makeProviderStub()
    mockGetProvider.mockReturnValue(providerStub)
    mockTranscribe.mockResolvedValueOnce(makeTranscriptionResult())

    await transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' })

    expect(mockGetProvider).toHaveBeenCalledOnce()
    expect(providerStub.transcription).toHaveBeenCalledWith('whisper-1')
    expect(mockTranscribe).toHaveBeenCalledOnce()
  })

  it('passes language providerOption when language is provided', async () => {
    mockTranscribe.mockResolvedValueOnce(makeTranscriptionResult())

    await transcribeVoiceBuffer({
      buffer: makeAudioBuffer(),
      mimeType: 'audio/webm',
      language: 'es',
    })

    const call = mockTranscribe.mock.calls[0][0]
    expect(call.providerOptions?.openai).toMatchObject({ language: 'es' })
  })

  it('omits language providerOption when not provided', async () => {
    mockTranscribe.mockResolvedValueOnce(makeTranscriptionResult())

    await transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' })

    const call = mockTranscribe.mock.calls[0][0]
    expect(call.providerOptions?.openai).not.toHaveProperty('language')
  })

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  it('throws AUTH error when getOpenAIAudioProvider throws', async () => {
    mockGetProvider.mockImplementationOnce(() => {
      throw new Error('OPENAI_API_KEY is required for audio features')
    })

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'AUTH', statusCode: 401 })
  })

  it('throws INVALID_FORMAT error for unsupported mime type', async () => {
    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/flac' }),
    ).rejects.toMatchObject({ code: 'INVALID_FORMAT', statusCode: 400 })
  })

  it('throws TOO_LARGE error when buffer exceeds limit', async () => {
    await expect(
      transcribeVoiceBuffer({
        buffer: makeAudioBuffer(VOICE_TRANSCRIPTION_MAX_SIZE_BYTES + 1),
        mimeType: 'audio/webm',
      }),
    ).rejects.toMatchObject({ code: 'TOO_LARGE', statusCode: 400 })
  })

  it('maps quota error from upstream to QUOTA code', async () => {
    mockTranscribe.mockRejectedValueOnce(new Error('quota exceeded'))

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'QUOTA', statusCode: 429 })
  })

  it('maps API key error from upstream to AUTH code', async () => {
    mockTranscribe.mockRejectedValueOnce(new Error('Invalid API key provided'))

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'AUTH', statusCode: 401 })
  })

  it('maps unknown upstream error to TRANSCRIBE_FAILED', async () => {
    mockTranscribe.mockRejectedValueOnce(new Error('network timeout'))

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'TRANSCRIBE_FAILED', statusCode: 500 })
  })

  it('wraps non-Error upstream throws as TRANSCRIBE_FAILED', async () => {
    mockTranscribe.mockRejectedValueOnce('unexpected string throw')

    await expect(
      transcribeVoiceBuffer({ buffer: makeAudioBuffer(), mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ code: 'TRANSCRIBE_FAILED', statusCode: 500 })
  })
})
