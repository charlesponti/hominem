import { experimental_transcribe } from 'ai'
import { Buffer } from 'node:buffer'
import { openai } from '@ai-sdk/openai'

import { env } from './env'

export const VOICE_TRANSCRIPTION_MAX_SIZE_BYTES = 25 * 1024 * 1024

export const VOICE_TRANSCRIPTION_SUPPORTED_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
] as const

type VoiceMimeType = (typeof VOICE_TRANSCRIPTION_SUPPORTED_TYPES)[number]

export interface VoiceTranscriptionOutput {
  text: string
  language?: string
  duration?: number
  words?: unknown[]
  segments?: unknown[]
}

export const VOICE_ERROR_CODES = [
  'INVALID_FORMAT',
  'TOO_LARGE',
  'AUTH',
  'QUOTA',
  'TRANSCRIBE_FAILED',
] as const

export type VoiceErrorCode = (typeof VOICE_ERROR_CODES)[number]

const VOICE_MIME_ALIASES: Record<string, string> = {
  'audio/x-wav': 'audio/wav',
  'audio/m4a': 'audio/mp4',
}

export class VoiceTranscriptionError extends Error {
  statusCode: number
  code: VoiceErrorCode

  constructor(message: string, code: VoiceErrorCode, statusCode = 500) {
    super(message)
    this.name = 'VoiceTranscriptionError'
    this.statusCode = statusCode
    this.code = code
  }
}

export function normalizeVoiceMimeType(mimeType: string): string {
  const [baseType] = mimeType.split(';', 1)
  const normalized = baseType?.trim().toLowerCase() ?? ''
  return VOICE_MIME_ALIASES[normalized] ?? normalized
}

export function getVoiceFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/webm': '.webm',
    'audio/mp4': '.mp4',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
  }
  return mimeToExt[mimeType] || '.webm'
}

export function validateVoiceInput(input: { mimeType: string; size: number }) {
  const normalizedMimeType = normalizeVoiceMimeType(input.mimeType)
  const { size } = input

  if (!VOICE_TRANSCRIPTION_SUPPORTED_TYPES.includes(normalizedMimeType as VoiceMimeType)) {
    throw new VoiceTranscriptionError(
      `Unsupported audio format: ${input.mimeType}. Supported formats: ${VOICE_TRANSCRIPTION_SUPPORTED_TYPES.join(', ')}`,
      'INVALID_FORMAT',
      400,
    )
  }

  if (size > VOICE_TRANSCRIPTION_MAX_SIZE_BYTES) {
    throw new VoiceTranscriptionError(
      `File too large. Maximum size is ${VOICE_TRANSCRIPTION_MAX_SIZE_BYTES / (1024 * 1024)}MB`,
      'TOO_LARGE',
      400,
    )
  }

  return normalizedMimeType
}

export async function transcribeVoiceBuffer(input: {
  buffer: ArrayBuffer
  mimeType: string
  fileName?: string
  language?: string
}): Promise<VoiceTranscriptionOutput> {
  const normalizedMimeType = validateVoiceInput({
    mimeType: input.mimeType,
    size: input.buffer.byteLength,
  })

  const _fileExtension = getVoiceFileExtension(normalizedMimeType)
  const _fileName = input.fileName || `audio${_fileExtension}`
  const audioBuffer = Buffer.from(input.buffer)

  try {
    if (!env.OPENAI_API_KEY) {
      throw new VoiceTranscriptionError('Invalid API configuration.', 'AUTH', 401)
    }

    const transcription = await experimental_transcribe({
      model: openai.transcription('whisper-1'),
      audio: audioBuffer,
      providerOptions: {
        openai: {
          ...(input.language ? { language: input.language } : {}),
          response_format: 'verbose_json',
          timestamp_granularities: ['word'],
        },
      },
    })

    return {
      text: transcription.text,
      ...(transcription.language ? { language: transcription.language } : {}),
      ...(typeof transcription.durationInSeconds === 'number'
        ? { duration: transcription.durationInSeconds }
        : {}),
      words: [],
      segments: transcription.segments.map((segment) => ({
        text: segment.text,
        start: segment.startSecond,
        end: segment.endSecond,
      })),
    }
  } catch (error) {
    if (error instanceof VoiceTranscriptionError) {
      throw error
    }

    if (error instanceof Error) {
      if (error.message.includes('Invalid file format')) {
        throw new VoiceTranscriptionError(
          'Invalid audio file format. Please use WAV, MP3, MP4, or WebM.',
          'INVALID_FORMAT',
          400,
        )
      }
      if (error.message.includes('File too large')) {
        throw new VoiceTranscriptionError(
          'Audio file is too large. Maximum size is 25MB.',
          'TOO_LARGE',
          400,
        )
      }
      if (error.message.includes('quota')) {
        throw new VoiceTranscriptionError('API quota exceeded. Please try again later.', 'QUOTA', 429)
      }
      if (error.message.includes('API key')) {
        throw new VoiceTranscriptionError('Invalid API configuration.', 'AUTH', 401)
      }
      throw new VoiceTranscriptionError(
        `Transcription failed: ${error.message}`,
        'TRANSCRIBE_FAILED',
        500,
      )
    }

    throw new VoiceTranscriptionError('Failed to transcribe audio', 'TRANSCRIBE_FAILED', 500)
  }
}
