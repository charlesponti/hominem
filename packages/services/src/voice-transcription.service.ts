import { Buffer } from 'node:buffer';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { logger } from '@hominem/utils/logger';

import { env } from './env';

/**
 * Directory for saving voice audio files for team review.
 * Uses repo .tmp/voice directory for easy access.
 */
function getVoiceAudioDir(): string {
  const possiblePaths = [
    './.tmp/voice',
    '../.tmp/voice',
    '../../.tmp/voice',
    '../../../.tmp/voice',
  ];

  for (const path of possiblePaths) {
    const dir = path.replace('/voice', '');
    if (existsSync(dir) || existsSync(path)) {
      return path;
    }
  }

  return './.tmp/voice';
}

export const VOICE_TRANSCRIPTION_MAX_SIZE_BYTES = 25 * 1024 * 1024;

export const VOICE_TRANSCRIPTION_SUPPORTED_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
] as const;

type VoiceMimeType = (typeof VOICE_TRANSCRIPTION_SUPPORTED_TYPES)[number];

export interface VoiceTranscriptionOutput {
  text: string;
  language?: string;
  duration?: number;
  words?: unknown[];
  segments?: unknown[];
  /** Path where the input audio file was saved for review (if SAVE_VOICE_AUDIO is enabled) */
  savedPath?: string | undefined;
}

export const VOICE_ERROR_CODES = [
  'INVALID_FORMAT',
  'TOO_LARGE',
  'AUTH',
  'QUOTA',
  'TRANSCRIBE_FAILED',
] as const;

export type VoiceErrorCode = (typeof VOICE_ERROR_CODES)[number];

export const VOICE_TRANSPORTS = ['hono-rpc'] as const;

export type VoiceTransport = (typeof VOICE_TRANSPORTS)[number];

const VOICE_MIME_ALIASES: Record<string, string> = {
  'audio/x-wav': 'audio/wav',
  'audio/m4a': 'audio/mp4',
};

/** Format string expected by the OpenRouter input_audio content block. */
const MIME_TO_OPENROUTER_FORMAT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
};

const TRANSCRIPTION_MODEL = 'google/gemini-2.5-flash-lite';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export class VoiceTranscriptionError extends Error {
  statusCode: number;
  code: VoiceErrorCode;

  constructor(message: string, code: VoiceErrorCode, statusCode = 500) {
    super(message);
    this.name = 'VoiceTranscriptionError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function normalizeVoiceMimeType(mimeType: string): string {
  const [baseType] = mimeType.split(';', 1);
  const normalized = baseType?.trim().toLowerCase() ?? '';
  return VOICE_MIME_ALIASES[normalized] ?? normalized;
}

export function getVoiceFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/webm': '.webm',
    'audio/mp4': '.mp4',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
  };
  return mimeToExt[mimeType] || '.webm';
}

export function validateVoiceInput(input: { mimeType: string; size: number }) {
  const normalizedMimeType = normalizeVoiceMimeType(input.mimeType);
  const { size } = input;

  if (!VOICE_TRANSCRIPTION_SUPPORTED_TYPES.includes(normalizedMimeType as VoiceMimeType)) {
    throw new VoiceTranscriptionError(
      `Unsupported audio format: ${input.mimeType}. Supported formats: ${VOICE_TRANSCRIPTION_SUPPORTED_TYPES.join(', ')}`,
      'INVALID_FORMAT',
      400,
    );
  }

  if (size > VOICE_TRANSCRIPTION_MAX_SIZE_BYTES) {
    throw new VoiceTranscriptionError(
      `File too large. Maximum size is ${VOICE_TRANSCRIPTION_MAX_SIZE_BYTES / (1024 * 1024)}MB`,
      'TOO_LARGE',
      400,
    );
  }

  return normalizedMimeType;
}

/**
 * Generate a timestamped filename for audio review
 */
function generateAudioFilename(prefix: string, ext: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${timestamp}.${ext}`;
}

export async function transcribeVoiceBuffer(input: {
  buffer: ArrayBuffer;
  mimeType: string;
  fileName?: string;
  language?: string;
  requestId?: string;
}): Promise<VoiceTranscriptionOutput> {
  const startTime = performance.now();
  const requestId = input.requestId ?? `vt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const normalizedMimeType = validateVoiceInput({
    mimeType: input.mimeType,
    size: input.buffer.byteLength,
  });

  if (!env.OPENROUTER_API_KEY) {
    logger.error('[voice-transcription] Missing OPENROUTER_API_KEY', { requestId });
    throw new VoiceTranscriptionError('Invalid API configuration.', 'AUTH', 401);
  }

  // Log the request
  logger.info('[voice-transcription] Request started', {
    requestId,
    model: TRANSCRIPTION_MODEL,
    mimeType: input.mimeType,
    normalizedMimeType,
    sizeBytes: input.buffer.byteLength,
    sizeKb: Math.round(input.buffer.byteLength / 1024),
    fileName: input.fileName,
    hasLanguageHint: !!input.language,
    language: input.language,
  });

  // Save input audio file for team review
  let savedPath: string | undefined;
  if (env.SAVE_VOICE_AUDIO === true) {
    try {
      const ext = getVoiceFileExtension(normalizedMimeType).slice(1);
      const filename = generateAudioFilename('voice_in', ext);
      const audioDir = getVoiceAudioDir();
      savedPath = join(audioDir, filename);
      const buffer = Buffer.from(input.buffer);
      await writeFile(savedPath, buffer);
      logger.info('[voice-transcription] Input audio saved for review', {
        requestId,
        savedPath,
        size: buffer.length,
      });
    } catch (saveError) {
      logger.warn('[voice-transcription] Failed to save input audio', {
        requestId,
        error: saveError instanceof Error ? saveError.message : 'Unknown',
      });
    }
  }

  const audioFormat = MIME_TO_OPENROUTER_FORMAT[normalizedMimeType] ?? 'mp3';
  const base64Audio = Buffer.from(input.buffer).toString('base64');

  const messages: object[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: input.language
            ? `Please transcribe this audio file exactly. The spoken language is ${input.language}.`
            : 'Please transcribe this audio file exactly. Return only the transcript, no commentary.',
        },
        {
          type: 'input_audio',
          input_audio: { data: base64Audio, format: audioFormat },
        },
      ],
    },
  ];

  let response: Response;
  let responseTime: number;

  try {
    const fetchStart = performance.now();
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hominem.app',
        'X-Title': 'Hominem',
      },
      body: JSON.stringify({ model: TRANSCRIPTION_MODEL, messages }),
    });
    responseTime = performance.now() - fetchStart;
  } catch (error) {
    const errorTime = performance.now() - startTime;
    logger.error('[voice-transcription] Fetch failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Math.round(errorTime),
    });

    if (error instanceof VoiceTranscriptionError) throw error;

    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        throw new VoiceTranscriptionError(
          'API quota exceeded. Please try again later.',
          'QUOTA',
          429,
        );
      }
      if (error.message.includes('API key') || error.message.includes('401')) {
        throw new VoiceTranscriptionError('Invalid API configuration.', 'AUTH', 401);
      }
      throw new VoiceTranscriptionError(
        `Transcription failed: ${error.message}`,
        'TRANSCRIBE_FAILED',
        500,
      );
    }

    throw new VoiceTranscriptionError('Failed to transcribe audio', 'TRANSCRIBE_FAILED', 500);
  }

  // Log the HTTP response
  logger.info('[voice-transcription] HTTP response received', {
    requestId,
    status: response.status,
    statusText: response.statusText,
    responseTimeMs: Math.round(responseTime),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const errorMessage = (errorBody['error'] as Record<string, unknown>)?.['message'] as
      | string
      | undefined;
    const totalTime = performance.now() - startTime;

    logger.error('[voice-transcription] API error response', {
      requestId,
      status: response.status,
      error: errorMessage ?? response.statusText,
      totalDurationMs: Math.round(totalTime),
    });

    if (response.status === 401 || response.status === 403) {
      throw new VoiceTranscriptionError('Invalid API configuration.', 'AUTH', 401);
    }
    if (response.status === 429) {
      throw new VoiceTranscriptionError(
        'API quota exceeded. Please try again later.',
        'QUOTA',
        429,
      );
    }
    throw new VoiceTranscriptionError(
      `Transcription failed: ${errorMessage ?? response.statusText}`,
      'TRANSCRIBE_FAILED',
      500,
    );
  }

  try {
    const parseStart = performance.now();
    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    const parseTime = performance.now() - parseStart;
    const totalTime = performance.now() - startTime;

    if (!text) {
      logger.warn('[voice-transcription] Empty transcript received', {
        requestId,
        totalDurationMs: Math.round(totalTime),
      });
    }

    // Log successful completion
    logger.info('[voice-transcription] Request completed successfully', {
      requestId,
      transcriptLength: text.length,
      transcriptPreview: text.slice(0, 150),
      parseTimeMs: Math.round(parseTime),
      totalTimeMs: Math.round(totalTime),
      savedPath,
    });

    return { text, savedPath };
  } catch (error) {
    const totalTime = performance.now() - startTime;

    if (error instanceof VoiceTranscriptionError) {
      logger.error('[voice-transcription] Processing error', {
        requestId,
        code: error.code,
        totalDurationMs: Math.round(totalTime),
      });
      throw error;
    }

    logger.error('[voice-transcription] Unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalDurationMs: Math.round(totalTime),
    });

    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        throw new VoiceTranscriptionError(
          'API quota exceeded. Please try again later.',
          'QUOTA',
          429,
        );
      }
      if (error.message.includes('API key') || error.message.includes('401')) {
        throw new VoiceTranscriptionError('Invalid API configuration.', 'AUTH', 401);
      }
      throw new VoiceTranscriptionError(
        `Transcription failed: ${error.message}`,
        'TRANSCRIBE_FAILED',
        500,
      );
    }

    throw new VoiceTranscriptionError('Failed to transcribe audio', 'TRANSCRIBE_FAILED', 500);
  }
}
