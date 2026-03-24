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
  // Try to find the repo root by looking for .tmp directory
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

/**
 * Voice response service — generates an AI audio reply to a user's text input.
 *
 * Uses OpenRouter's `openai/gpt-4o-audio-preview` model which supports
 * `modalities: ["text", "audio"]` and returns both a spoken audio buffer and
 * a text transcript via SSE streaming.
 *
 * OpenRouter docs: https://openrouter.ai/docs/guides/overview/multimodal/audio
 */

const VOICE_RESPONSE_MODEL = 'openai/gpt-4o-audio-preview';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export type VoiceResponseVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * Requested output format. Note: the underlying model (gpt-4o-audio-preview)
 * requires streaming, which only supports 'pcm16'. The service handles this
 * and always returns PCM16 audio.
 */
export type VoiceResponseFormat = 'pcm16';

const FORMAT_TO_MIME: Record<VoiceResponseFormat, string> = {
  pcm16: 'audio/pcm',
};

const FORMAT_TO_EXT: Record<VoiceResponseFormat, string> = {
  pcm16: 'pcm',
};

export const VOICE_RESPONSE_ERROR_CODES = [
  'AUTH',
  'QUOTA',
  'CONTENT_POLICY',
  'RESPONSE_FAILED',
] as const;

export type VoiceResponseErrorCode = (typeof VOICE_RESPONSE_ERROR_CODES)[number];

export class VoiceResponseError extends Error {
  statusCode: number;
  code: VoiceResponseErrorCode;

  constructor(message: string, code: VoiceResponseErrorCode, statusCode = 500) {
    super(message);
    this.name = 'VoiceResponseError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface VoiceResponseOutput {
  /** Raw audio bytes ready to stream to the client */
  audioBuffer: Buffer;
  /** MIME type for PCM16 audio */
  mimeType: string;
  /** Text transcript of what the model said */
  transcript: string;
  /** Path where the audio file was saved for review (if SAVE_VOICE_AUDIO is enabled) */
  savedPath?: string | undefined;
}

export interface VoiceResponseInput {
  /** The user's message or transcribed speech to respond to */
  text: string;
  /** Optional system prompt to shape the AI's persona / behaviour */
  systemPrompt?: string;
  /** Voice to use. Defaults to "alloy" */
  voice?: VoiceResponseVoice;
  /** Audio format for the response. Only "pcm16" is supported for streaming. */
  format?: VoiceResponseFormat;
  /** Optional request ID for logging/tracking */
  requestId?: string;
}

/**
 * SSE chunk shape from OpenRouter audio output streaming.
 * Only the fields we care about are typed; the rest are unknown.
 */
interface AudioChunk {
  choices?: Array<{
    delta?: {
      audio?: {
        data?: string;
        transcript?: string;
      };
    };
    finish_reason?: string | null;
  }>;
}

/**
 * Parse an SSE stream from a fetch Response and collect audio chunks + transcript.
 * OpenRouter delivers audio as incremental base64 chunks in `delta.audio.data`.
 */
async function collectAudioStream(
  response: Response,
): Promise<{ audioB64: string; transcript: string }> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new VoiceResponseError('No response body from audio stream', 'RESPONSE_FAILED', 500);
  }

  const decoder = new TextDecoder();
  const audioChunks: string[] = [];
  const transcriptChunks: string[] = [];
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice('data: '.length).trim();
        if (data === '[DONE]') break;

        try {
          const chunk = JSON.parse(data) as AudioChunk;
          const audio = chunk.choices?.[0]?.delta?.audio;
          if (audio?.data) audioChunks.push(audio.data);
          if (audio?.transcript) transcriptChunks.push(audio.transcript);
        } catch {
          // Malformed chunk — skip silently
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    audioB64: audioChunks.join(''),
    transcript: transcriptChunks.join(''),
  };
}

/**
 * Generate a timestamped filename for audio review
 */
function generateAudioFilename(prefix: string, format: VoiceResponseFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = FORMAT_TO_EXT[format];
  return `${prefix}_${timestamp}.${ext}`;
}

/**
 * Generate an AI spoken audio response to the given text.
 *
 * Flow: text → OpenRouter gpt-4o-audio-preview → SSE audio stream → Buffer
 *
 * NOTE: The model requires streaming, which only supports 'pcm16' format.
 *
 * @throws {VoiceResponseError} on API errors, auth failures, or quota exhaustion
 */
export async function generateVoiceResponse(
  input: VoiceResponseInput,
): Promise<VoiceResponseOutput> {
  const startTime = performance.now();
  const requestId = input.requestId ?? `vr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (!env.OPENROUTER_API_KEY) {
    logger.error('[voice-response] Missing OPENROUTER_API_KEY', { requestId });
    throw new VoiceResponseError('Invalid API configuration.', 'AUTH', 401);
  }

  const voice: VoiceResponseVoice = input.voice ?? 'alloy';
  const format: VoiceResponseFormat = input.format ?? 'pcm16';
  const mimeType = FORMAT_TO_MIME[format];

  const messages: object[] = [];

  if (input.systemPrompt) {
    messages.push({ role: 'system', content: input.systemPrompt });
  }

  messages.push({ role: 'user', content: input.text });

  // Log the request
  logger.info('[voice-response] Request started', {
    requestId,
    model: VOICE_RESPONSE_MODEL,
    textLength: input.text.length,
    textPreview: input.text.slice(0, 100),
    voice,
    format,
    hasSystemPrompt: !!input.systemPrompt,
    messageCount: messages.length,
  });

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
      body: JSON.stringify({
        model: VOICE_RESPONSE_MODEL,
        messages,
        modalities: ['text', 'audio'],
        audio: { voice, format: 'pcm16' }, // Streaming requires pcm16
        stream: true,
      }),
    });
    responseTime = performance.now() - fetchStart;
  } catch (error) {
    const errorTime = performance.now() - startTime;
    logger.error('[voice-response] Fetch failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Math.round(errorTime),
    });

    if (error instanceof VoiceResponseError) throw error;
    if (error instanceof Error) {
      throw new VoiceResponseError(
        `Voice response request failed: ${error.message}`,
        'RESPONSE_FAILED',
        500,
      );
    }
    throw new VoiceResponseError('Voice response request failed', 'RESPONSE_FAILED', 500);
  }

  // Log the HTTP response
  logger.info('[voice-response] HTTP response received', {
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

    logger.error('[voice-response] API error response', {
      requestId,
      status: response.status,
      error: errorMessage ?? response.statusText,
      totalDurationMs: Math.round(totalTime),
    });

    if (response.status === 401 || response.status === 403) {
      throw new VoiceResponseError('Invalid API configuration.', 'AUTH', 401);
    }
    if (response.status === 429) {
      throw new VoiceResponseError('API quota exceeded. Please try again later.', 'QUOTA', 429);
    }
    if (response.status === 400 && errorMessage?.includes('content_policy')) {
      throw new VoiceResponseError('Content not allowed by content policy.', 'CONTENT_POLICY', 400);
    }
    throw new VoiceResponseError(
      `Voice response failed: ${errorMessage ?? response.statusText}`,
      'RESPONSE_FAILED',
      500,
    );
  }

  try {
    const streamStart = performance.now();
    const { audioB64, transcript } = await collectAudioStream(response);
    const streamTime = performance.now() - streamStart;
    const totalTime = performance.now() - startTime;

    if (!audioB64) {
      logger.error('[voice-response] No audio data in stream', {
        requestId,
        totalDurationMs: Math.round(totalTime),
      });
      throw new VoiceResponseError('No audio data received from model', 'RESPONSE_FAILED', 500);
    }

    const audioBuffer = Buffer.from(audioB64, 'base64');

    // Save audio file for team review
    let savedPath: string | undefined;
    if (env.SAVE_VOICE_AUDIO === true) {
      try {
        const filename = generateAudioFilename('voice_out', format);
        const audioDir = getVoiceAudioDir();
        savedPath = join(audioDir, filename);
        await writeFile(savedPath, audioBuffer);
        logger.info('[voice-response] Audio saved for review', {
          requestId,
          savedPath,
          size: audioBuffer.length,
        });
      } catch (saveError) {
        logger.warn('[voice-response] Failed to save audio file', {
          requestId,
          error: saveError instanceof Error ? saveError.message : 'Unknown',
        });
      }
    }

    // Log successful completion
    logger.info('[voice-response] Request completed successfully', {
      requestId,
      transcriptLength: transcript.length,
      transcriptPreview: transcript.slice(0, 150),
      audioSizeBytes: audioBuffer.length,
      audioSizeKb: Math.round(audioBuffer.length / 1024),
      streamTimeMs: Math.round(streamTime),
      totalTimeMs: Math.round(totalTime),
      savedPath,
    });

    return {
      audioBuffer,
      mimeType,
      transcript,
      savedPath,
    };
  } catch (error) {
    const totalTime = performance.now() - startTime;

    if (error instanceof VoiceResponseError) {
      logger.error('[voice-response] Stream processing error', {
        requestId,
        code: error.code,
        totalDurationMs: Math.round(totalTime),
      });
      throw error;
    }

    logger.error('[voice-response] Unexpected stream error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalDurationMs: Math.round(totalTime),
    });

    if (error instanceof Error) {
      throw new VoiceResponseError(
        `Failed to process audio stream: ${error.message}`,
        'RESPONSE_FAILED',
        500,
      );
    }
    throw new VoiceResponseError('Failed to process audio stream', 'RESPONSE_FAILED', 500);
  }
}
