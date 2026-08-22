import { AUDIO_TTS_MODEL, createOpenRouterClient, normalizeOpenRouterError } from './shared';
import type { OpenRouterClientOptions } from './shared';

type SynthesizeSpeechInput = OpenRouterClientOptions & {
  text: string;
  model?: string;
  voice?: string;
  responseFormat?: 'mp3' | 'pcm';
};

type SynthesizeSpeechResult = {
  buffer: Buffer;
  mimeType: string;
};

export type SynthesizeSpeechStreamResult = {
  stream: ReadableStream<Uint8Array>;
  mimeType: string;
};

const RESPONSE_FORMAT_MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  pcm: 'audio/L16',
};

// Kokoro-82m (and TTS-only models generally) aren't chat models, so this goes
// through the SDK's dedicated `tts.createSpeech` client rather than `chat()` —
export async function synthesizeSpeechStream(
  input: SynthesizeSpeechInput,
): Promise<SynthesizeSpeechStreamResult> {
  const client = createOpenRouterClient(input);
  const model = input.model ?? AUDIO_TTS_MODEL;
  const responseFormat = input.responseFormat ?? 'mp3';

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await client.tts.createSpeech({
      speechRequest: {
        input: input.text,
        model,
        voice: input.voice ?? 'af_heart',
        responseFormat,
      },
    });
  } catch (error) {
    throw normalizeOpenRouterError(error);
  }

  return {
    stream,
    mimeType: RESPONSE_FORMAT_MIME_TYPES[responseFormat] ?? 'audio/mpeg',
  };
}

export async function synthesizeSpeech(
  input: SynthesizeSpeechInput,
): Promise<SynthesizeSpeechResult> {
  const { stream, mimeType } = await synthesizeSpeechStream(input);
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return {
    buffer: Buffer.concat(chunks),
    mimeType,
  };
}
