import type {
  MobileVoiceTranscriptionErrorOutput,
  MobileVoiceTranscriptionOutput,
  MobileVoiceResponseErrorOutput,
} from '@hominem/rpc/types/mobile.types';
import { generateVoiceResponse, VoiceResponseError } from '@hominem/services/voice-response';
import { generateSpeechBuffer, VoiceSpeechError } from '@hominem/services/voice-speech';
import {
  VoiceTranscriptionError,
  transcribeVoiceBuffer,
} from '@hominem/services/voice-transcription';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

export const voiceRoutes = new Hono<AppContext>().post('/transcribe', async (c) => {
  try {
    const body = await c.req.parseBody();
    const input = body.audio;

    const audioFile = Array.isArray(input) ? input[0] : input;
    const languageInput = body.language;
    const language =
      typeof languageInput === 'string' && languageInput.trim().length > 0
        ? languageInput.trim()
        : undefined;

    if (!(audioFile instanceof File)) {
      return c.json<MobileVoiceTranscriptionErrorOutput>(
        { error: 'No audio file provided', code: 'INVALID_FORMAT' },
        400,
      );
    }

    const output = await transcribeVoiceBuffer({
      buffer: await audioFile.arrayBuffer(),
      mimeType: audioFile.type,
      ...(audioFile.name ? { fileName: audioFile.name } : {}),
      ...(language ? { language } : {}),
    });

    const response: MobileVoiceTranscriptionOutput = {
      text: output.text,
      ...(output.language ? { language: output.language } : {}),
      ...(typeof output.duration === 'number' ? { duration: output.duration } : {}),
      ...(output.words ? { words: output.words } : {}),
      ...(output.segments ? { segments: output.segments } : {}),
    };

    return c.json<MobileVoiceTranscriptionOutput>(response);
  } catch (error) {
    if (error instanceof VoiceTranscriptionError) {
      const statusCode =
        error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 429
          ? error.statusCode
          : 500;
      return c.json<MobileVoiceTranscriptionErrorOutput>(
        { error: error.message, code: error.code },
        statusCode,
      );
    }

    return c.json<MobileVoiceTranscriptionErrorOutput>(
      { error: 'Failed to transcribe audio', code: 'TRANSCRIBE_FAILED' },
      500,
    );
  }
});

export const authenticatedVoiceRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .route('', voiceRoutes)
  .post(
    '/speech',
    zValidator(
      'json',
      z.object({
        text: z.string().min(1).max(4096),
        voice: z.string().default('alloy'),
        speed: z.number().min(0.25).max(4).default(1),
      }),
    ),
    async (c) => {
      const { text, voice, speed } = c.req.valid('json');
      try {
        const { audioBuffer, mediaType } = await generateSpeechBuffer({ text, voice, speed });
        c.header('Content-Type', mediaType);
        c.header('Content-Length', String(audioBuffer.byteLength));
        return c.body(audioBuffer);
      } catch (error) {
        if (error instanceof VoiceSpeechError) {
          const statusCode =
            error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 429
              ? error.statusCode
              : 500;
          return c.json({ error: error.message }, statusCode);
        }
        return c.json({ error: 'Failed to generate speech' }, 500);
      }
    },
  )
  .post('/respond', async (c) => {
    try {
      const body = await c.req.parseBody();
      const input = body.audio;
      const audioFile = Array.isArray(input) ? input[0] : input;
      const languageInput = body.language;
      const language =
        typeof languageInput === 'string' && languageInput.trim().length > 0
          ? languageInput.trim()
          : undefined;

      if (!(audioFile instanceof File)) {
        return c.json<MobileVoiceResponseErrorOutput>(
          { error: 'No audio file provided', code: 'RESPONSE_FAILED' },
          400,
        );
      }

      const transcription = await transcribeVoiceBuffer({
        buffer: await audioFile.arrayBuffer(),
        mimeType: audioFile.type,
        ...(audioFile.name ? { fileName: audioFile.name } : {}),
        ...(language ? { language } : {}),
      });

      const rawVoice = typeof body.voice === 'string' ? body.voice : 'alloy';
      const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
      type Voice = (typeof VALID_VOICES)[number];
      const voice: Voice = (VALID_VOICES as readonly string[]).includes(rawVoice)
        ? (rawVoice as Voice)
        : 'alloy';

      const systemPrompt =
        typeof body.systemPrompt === 'string'
          ? body.systemPrompt
          : 'You are a helpful assistant. Respond naturally in the same language as the user.';

      const responseInput = {
        text: transcription.text,
        voice,
        format: 'pcm16' as const,
        systemPrompt,
      };
      const { audioBuffer, mimeType, transcript } = await generateVoiceResponse(responseInput);

      const ab = audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.byteLength,
      ) as ArrayBuffer;
      const uint8 = new Uint8Array(ab);
      return c.newResponse(uint8, 200, {
        'Content-Type': mimeType,
        'Content-Length': String(uint8.byteLength),
        'X-User-Transcript': encodeURIComponent(transcription.text),
        'X-AI-Transcript': encodeURIComponent(transcript),
      });
    } catch (error) {
      if (error instanceof VoiceTranscriptionError) {
        const statusCode =
          error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 429
            ? error.statusCode
            : 500;
        return c.json<MobileVoiceResponseErrorOutput>(
          { error: error.message, code: 'RESPONSE_FAILED' },
          statusCode,
        );
      }
      if (error instanceof VoiceResponseError) {
        const statusCode =
          error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 429
            ? error.statusCode
            : 500;
        return c.json<MobileVoiceResponseErrorOutput>(
          { error: error.message, code: error.code },
          statusCode,
        );
      }
      return c.json<MobileVoiceResponseErrorOutput>(
        { error: 'Failed to generate voice response', code: 'RESPONSE_FAILED' },
        500,
      );
    }
  });
