import { AUDIO_TTS_MODEL, createOpenRouterClient, normalizeOpenRouterError } from './shared';
import type { OpenRouterClientOptions } from './shared';

export type SynthesizeSpeechInput = OpenRouterClientOptions & {
  text: string;
  model?: string;
  voice?: string;
  responseFormat?: 'mp3' | 'pcm';
};

export type SynthesizeSpeechResult = {
  buffer: Buffer;
  mimeType: string;
};

const RESPONSE_FORMAT_MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  pcm: 'audio/L16',
};

// Kokoro-82m (and TTS-only models generally) aren't chat models, so this goes
// through the SDK's dedicated `tts.createSpeech` client rather than `chat()` —
// see packages/ai/src/text.ts's postChatCompletion for the (unused-by-this-
// feature) audio-modality-via-chat-completions path used by audio-native
// audio-capable speech models.
export async function synthesizeSpeech(
  input: SynthesizeSpeechInput,
): Promise<SynthesizeSpeechResult> {
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

  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return {
    buffer: Buffer.concat(chunks),
    mimeType: RESPONSE_FORMAT_MIME_TYPES[responseFormat] ?? 'audio/mpeg',
  };
}
